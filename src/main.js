import 'mdui/mdui.css';
import '@fontsource/noto-sans/latin-400.css';
import '@fontsource/noto-sans/latin-500.css';
import '@fontsource/noto-sans/latin-700.css';
import '@fontsource/noto-sans-sc/chinese-simplified-400.css';
import '@fontsource/noto-sans-sc/chinese-simplified-500.css';
import '@fontsource/noto-sans-sc/chinese-simplified-700.css';
import '@fontsource/material-icons/latin-400.css';
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
