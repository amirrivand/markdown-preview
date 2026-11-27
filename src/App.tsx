import { DesktopViewer } from './components/DesktopViewer';
import { MobileViewer } from './components/MobileViewer';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useViewerState } from './hooks/useViewerState';

/** Breakpoint where the dedicated mobile shell takes over (phones / small tablets). */
const MOBILE_QUERY = '(max-width: 767px)';

export default function App() {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const viewer = useViewerState();

  return isMobile ? <MobileViewer {...viewer} /> : <DesktopViewer {...viewer} />;
}
