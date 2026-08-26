import base64
import json
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path

import websocket

BASE_URL = os.environ.get('CGB_PREVIEW_URL', 'http://127.0.0.1:8765/')
OUTPUT_DIR = Path('docs/validation/venue-photo-visuals')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def targets():
    with urllib.request.urlopen('http://127.0.0.1:9222/json', timeout=3) as response:
        return json.load(response)


deadline = time.time() + 20
page = None
while time.time() < deadline:
    try:
        page = next((item for item in targets() if item.get('type') == 'page'), None)
        if page:
            break
    except Exception:
        pass
    time.sleep(0.25)
if not page:
    raise RuntimeError('Chrome DevTools page target was not available')

socket = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=30)
sequence = 0


def command(method, params=None):
    global sequence
    sequence += 1
    message_id = sequence
    socket.send(json.dumps({'id': message_id, 'method': method, 'params': params or {}}))
    while True:
        response = json.loads(socket.recv())
        if response.get('id') == message_id:
            if 'error' in response:
                raise RuntimeError(f"{method}: {response['error']}")
            return response.get('result', {})


def evaluate(expression):
    result = command('Runtime.evaluate', {
        'expression': expression,
        'returnByValue': True,
        'awaitPromise': True
    })
    if result.get('exceptionDetails'):
        raise RuntimeError(result['exceptionDetails'])
    return result.get('result', {}).get('value')


def wait_for(expression, seconds=30):
    end = time.time() + seconds
    while time.time() < end:
        try:
            if evaluate(expression):
                return
        except Exception:
            pass
        time.sleep(0.25)
    raise RuntimeError(f'Timed out waiting for: {expression}')


def set_viewport(width, height, mobile):
    command('Emulation.setDeviceMetricsOverride', {
        'width': width,
        'height': height,
        'deviceScaleFactor': 1,
        'mobile': mobile,
        'screenWidth': width,
        'screenHeight': height
    })
    command('Emulation.setTouchEmulationEnabled', {'enabled': mobile, 'maxTouchPoints': 5 if mobile else 1})


def navigate(slug):
    url = f"{BASE_URL}?venue={urllib.parse.quote(slug)}"
    command('Page.navigate', {'url': url})
    wait_for("document.readyState === 'complete' && (window.CGBApp?.getState?.()?.snapshot?.venues?.length || 0) > 0")
    wait_for(f"window.CGBApp?.getState?.()?.snapshot?.venues?.some(v => v.slug === {json.dumps(slug)})")
    wait_for(f"window.CGBApp?.getState?.()?.selectedVenueId === window.CGBApp?.getState?.()?.snapshot?.venues?.find(v => v.slug === {json.dumps(slug)})?.venue_id")
    time.sleep(1)


def screenshot(name):
    data = command('Page.captureScreenshot', {
        'format': 'png',
        'captureBeyondViewport': False,
        'fromSurface': True
    })['data']
    (OUTPUT_DIR / f'{name}.png').write_bytes(base64.b64decode(data))


def photo_diagnostic():
    return evaluate("""(() => {
      const state = window.CGBApp.getState();
      const venue = state.snapshot.venues.find(v => v.venue_id === state.selectedVenueId);
      const figure = document.querySelector('#venue-detail .detail-photo');
      const frame = document.querySelector('#venue-detail .detail-photo__frame');
      const image = document.querySelector('#venue-detail .detail-photo__image');
      const rect = frame?.getBoundingClientRect();
      return {
        detailMode: state.detailMode,
        venue: venue?.name || '',
        slug: venue?.slug || '',
        photoUrl: venue?.photo_url || '',
        figurePresent: Boolean(figure),
        imageComplete: Boolean(image?.complete),
        naturalWidth: image?.naturalWidth || 0,
        naturalHeight: image?.naturalHeight || 0,
        frameWidth: rect?.width || 0,
        frameHeight: rect?.height || 0,
        frameRatio: rect?.height ? rect.width / rect.height : 0,
        aspectRatio: frame ? getComputedStyle(frame).aspectRatio : '',
        objectFit: image ? getComputedStyle(image).objectFit : '',
        caption: document.querySelector('#venue-detail .detail-photo__caption')?.textContent?.trim() || '',
        credit: document.querySelector('#venue-detail .detail-photo__credit')?.textContent?.trim() || '',
        bodyView: document.body.dataset.view || '',
        detailState: document.body.dataset.detailState || ''
      };
    })()""")


def choose_no_photo_slug():
    return evaluate("""(() => {
      const state = window.CGBApp.getState();
      return state.snapshot.venues.find(v => !String(v.photo_url || '').trim())?.slug || '';
    })()""")


command('Page.enable')
command('Runtime.enable')
command('Network.enable')

results = {}

set_viewport(390, 844, True)
navigate('busby-s-west-santa-monica')
wait_for("document.querySelector('#venue-detail .detail-photo__image')?.complete && document.querySelector('#venue-detail .detail-photo__image')?.naturalWidth > 0", 30)
results['mobile'] = photo_diagnostic()
screenshot('busbys-west-iphone-portrait')

set_viewport(1440, 1000, False)
navigate('busby-s-west-santa-monica')
wait_for("document.querySelector('#venue-detail .detail-photo__image')?.complete && document.querySelector('#venue-detail .detail-photo__image')?.naturalWidth > 0", 30)
results['desktop'] = photo_diagnostic()
screenshot('busbys-west-desktop')

set_viewport(390, 844, True)
no_photo_slug = choose_no_photo_slug()
if not no_photo_slug:
    raise RuntimeError('No venue without a photo was available for fallback validation')
navigate(no_photo_slug)
wait_for("!document.querySelector('#venue-detail .detail-photo') && Boolean(document.querySelector('#venue-detail .detail-local-map'))", 30)
results['noPhoto'] = evaluate("""(() => {
  const state = window.CGBApp.getState();
  const venue = state.snapshot.venues.find(v => v.venue_id === state.selectedVenueId);
  return {
    venue: venue?.name || '',
    slug: venue?.slug || '',
    photoPresent: Boolean(document.querySelector('#venue-detail .detail-photo')),
    localMapPresent: Boolean(document.querySelector('#venue-detail .detail-local-map')),
    bodyView: document.body.dataset.view || '',
    detailState: document.body.dataset.detailState || ''
  };
})()""")
screenshot('no-photo-fallback-iphone')

for key in ('mobile', 'desktop'):
    item = results[key]
    if abs(item['frameRatio'] - (4 / 3)) > 0.02:
        raise RuntimeError(f"{key} frame ratio is not 4:3: {item['frameRatio']}")
    if item['objectFit'] != 'contain':
        raise RuntimeError(f"{key} object-fit is not contain: {item['objectFit']}")
    if not item['caption'] or not item['credit']:
        raise RuntimeError(f"{key} caption/credit is missing: {item}")

print(json.dumps(results, indent=2))
