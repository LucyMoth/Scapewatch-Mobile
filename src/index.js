import styles from './styles/index.css';
import { prepareGameLayout } from './game-layout.js';
import { initializeRenderer } from './mobile-renderer.js';
import { initializeMobileUi } from './ui/index.js';

if (prepareGameLayout()) {
  initializeRenderer();
  initializeMobileUi(styles);
}
