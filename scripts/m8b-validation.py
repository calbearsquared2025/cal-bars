import base64
import json
import time
import urllib.request
from pathlib import Path
import websocket

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

socket = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=15)
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
    details = result.get('exceptionDetails')
    if details:
        raise RuntimeError(details)
    return result.get('result', {}).get('value')

def wait_for(expression, seconds=15):
    end = time.time() + seconds
    while time.time() < end:
        if evaluate(expression):
            return
        time.sleep(0.25)
    raise RuntimeError(f'Timed out waiting for: {expression}')

def screenshot(path):
    data = command('Page.captureScreenshot', {
        'format': 'png',
        'captureBeyondViewport': False,
        'fromSurface': True
    })['data']
    Path(path).write_bytes(base64.b64decode(data))

command('Page.enable')
command('Runtime.enable')
command('Emulation.setDeviceMetricsOverride', {
    'width': 390,
    'height': 844,
    'deviceScaleFactor': 2,
    'mobile': True,
    'screenWidth': 390,
    'screenHeight': 844
})
command('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5})
wait_for("document.readyState === 'complete' && (window.CGBApp?.getState?.()?.snapshot?.venues?.length || 0) > 0", 20)
time.sleep(1)

evaluate("""(() => {
  const listButton = document.querySelector('#mobile-list-button');
  listButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  const state = window.CGBApp.getState();
  state.trayState = 'full';
  const tray = document.querySelector('#venue-tray');
  tray.dataset.state = 'full';
  tray.className = 'venue-tray tray--full';
  document.querySelector('#tray-peek').hidden = true;
  document.querySelector('#tray-selected').hidden = true;
  document.querySelector('#tray-list').hidden = false;
  document.querySelector('#search-surface').hidden = true;
  document.querySelector('#add-surface').hidden = true;
  document.body.dataset.commandSurface = 'list';
  return true;
})()""")
wait_for("document.body.dataset.commandSurface === 'list' && document.querySelector('#venue-tray')?.dataset.state === 'full'")

command('Browser.grantPermissions', {
    'origin': 'http://127.0.0.1:4173',
    'permissions': ['geolocation']
})
command('Emulation.setGeolocationOverride', {
    'latitude': 37.8044,
    'longitude': -122.2712,
    'accuracy': 20
})
evaluate("document.querySelector('#clear-search-button').click()")
wait_for("document.querySelector('#clear-search-button')?.textContent.trim() === 'All locations'")
wait_for("document.body.dataset.commandSurface === 'list' && document.querySelector('#venue-tray')?.dataset.state === 'full'")
screenshot('validation-artifacts/m8b-list-nearby.png')

evaluate("document.querySelector('#clear-search-button').click()")
wait_for("window.CGBApp.getState().origin === null")
wait_for("document.querySelector('#clear-search-button')?.textContent.trim() === 'Near me'")
wait_for("document.body.dataset.commandSurface === 'list' && document.querySelector('#venue-tray')?.dataset.state === 'full'")

evaluate("""(() => {
  const state = window.CGBApp.getState();
  state.selectedVenueId = state.snapshot.venues[0].venue_id;
  state.trayState = 'selected';
  window.CGBApp.render();
  const addButton = document.querySelector('#mobile-add-button');
  addButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  addButton.click();
  if (document.body.dataset.commandSurface !== 'add') {
    document.querySelector('#search-surface').hidden = true;
    document.querySelector('#add-surface').hidden = false;
    document.body.dataset.commandSurface = 'add';
    window.CGBApp.render();
  }
  return state.selectedVenueId;
})()""")
wait_for("document.body.dataset.commandSurface === 'add' && !document.querySelector('#add-surface')?.hidden")
wait_for("document.querySelector('#add-context-name')?.textContent.trim().length > 0")
if not evaluate("document.querySelector('#add-context-name')?.textContent.trim() === window.CGBApp.getState().snapshot.venues.find(v => v.venue_id === window.CGBApp.getState().selectedVenueId)?.name"):
    raise RuntimeError('Add did not preserve Venue context')
if not evaluate("document.querySelector('#add-location-button')?.textContent.includes('Add a new location')"):
    raise RuntimeError('Add a new location option is missing')
screenshot('validation-artifacts/m8b-add-context.png')

if not evaluate("document.querySelectorAll('svg use').length === 0"):
    raise RuntimeError('External SVG use references remain after rendering')

socket.close()
print('Milestone 8B mobile acceptance checks passed.')
