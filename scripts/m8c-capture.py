import base64
import json
import os
import time
import urllib.request
from pathlib import Path

import websocket

BASE_URL = os.environ.get('CGB_PREVIEW_URL', 'http://127.0.0.1:4173/')
PHASE = os.environ.get('M8C_PHASE', 'before')
OUTPUT_DIR = Path('docs/validation/m8c') / PHASE
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

socket = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=20)
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


def wait_for(expression, seconds=20):
    end = time.time() + seconds
    while time.time() < end:
        try:
            if evaluate(expression):
                return
        except Exception:
            pass
        time.sleep(0.25)
    raise RuntimeError(f'Timed out waiting for: {expression}')


def navigate():
    command('Page.navigate', {'url': BASE_URL})
    wait_for("document.readyState === 'complete' && (window.CGBApp?.getState?.()?.snapshot?.venues?.length || 0) > 0", 25)
    time.sleep(1.2)


def click(selector):
    result = evaluate(f"""(() => {{
      const node = document.querySelector({json.dumps(selector)});
      if (!node) return false;
      node.click();
      return true;
    }})()""")
    if not result:
        raise RuntimeError(f'Unable to click {selector}')
    time.sleep(0.8)


def select_venue(predicate):
    venue_id = evaluate(f"""(() => {{
      const state = window.CGBApp.getState();
      const venue = state.snapshot.venues.find((venue) => ({predicate}));
      return venue?.venue_id || '';
    }})()""")
    if not venue_id:
        raise RuntimeError(f'No venue matched predicate: {predicate}')
    selector = f'.cgb-marker[data-venue-id="{venue_id}"]'
    wait_for(f"Boolean(document.querySelector({json.dumps(selector)}))")
    click(selector)
    wait_for("document.querySelector('#venue-tray')?.dataset.state === 'selected'")
    return venue_id


def select_watch_party():
    venue_id = evaluate("""(() => {
      const state = window.CGBApp.getState();
      const parties = state.snapshot.watchParties || state.snapshot.watch_parties || [];
      const party = parties.find((item) => item.game_id === state.gameId) || parties[0];
      return party?.venue_id || '';
    })()""")
    if not venue_id:
        raise RuntimeError('No watch party venue is available in the snapshot')
    selector = f'.cgb-marker[data-venue-id="{venue_id}"]'
    wait_for(f"Boolean(document.querySelector({json.dumps(selector)}))")
    click(selector)
    wait_for("document.querySelector('#venue-tray')?.dataset.state === 'selected'")


def screenshot(name):
    data = command('Page.captureScreenshot', {
        'format': 'webp',
        'quality': 76,
        'captureBeyondViewport': False,
        'fromSurface': True
    })['data']
    (OUTPUT_DIR / f'{name}.webp').write_bytes(base64.b64decode(data))


command('Page.enable')
command('Runtime.enable')
command('Network.enable')
command('Emulation.setDeviceMetricsOverride', {
    'width': 390,
    'height': 844,
    'deviceScaleFactor': 1,
    'mobile': True,
    'screenWidth': 390,
    'screenHeight': 844
})
command('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5})
command('Network.setBlockedURLs', {'urls': ['https://script.google.com/*']})
command('Page.addScriptToEvaluateOnNewDocument', {
    'source': "try { localStorage.removeItem('cgb_v2_public_data_url'); localStorage.removeItem('cgb_v2_last_good_snapshot'); } catch (_) {}"
})

navigate()
screenshot('map')

navigate()
select_venue("venue.venue_type === 'cal_bar'")
screenshot('tray')

navigate()
select_watch_party()
screenshot('watch-party')

navigate()
select_venue("venue.venue_type === 'community_location'")
screenshot('fan-added')

navigate()
click('#mobile-list-button')
wait_for("document.body.dataset.commandSurface === 'list' && document.querySelector('#venue-tray')?.dataset.state === 'full'")
screenshot('list')

navigate()
select_venue("venue.venue_type === 'community_location'")
click('#mobile-add-button')
wait_for("document.body.dataset.commandSurface === 'add' && !document.querySelector('#add-surface')?.hidden")
screenshot('add')

print(json.dumps({'phase': PHASE, 'screenshots': sorted(path.name for path in OUTPUT_DIR.glob('*.webp'))}, indent=2))
