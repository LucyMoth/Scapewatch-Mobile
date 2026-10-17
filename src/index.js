import styles from './styles/index.css';
import { initializeRenderer } from './mobile-renderer.js';
import { initializeMobileUi } from './ui/index.js';

initializeRenderer();
initializeMobileUi(styles);
