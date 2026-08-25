import 'mdui/mdui.css';
import './css/fonts-cdn.css';
import { setTheme, setColorScheme } from 'mdui';
import './css/control-panel.css';
import './css/control-panel-responsive.css';
import { resolveUidRoute } from './lib/uid-routing.js';
import { init } from './modules/init.js';

const uidRoute = resolveUidRoute(location.href);

if (uidRoute.navigation === 'location') {
  location.replace(uidRoute.target);
} else {
  if (uidRoute.navigation === 'history') {
    history.replaceState(history.state, '', uidRoute.target);
  }
  setTheme('auto');
  setColorScheme('#1976D2');
  init(uidRoute);
}
