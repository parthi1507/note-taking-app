import { useWindowDimensions } from 'react-native';

type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'tv';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width < 768 ? 'mobile' :
    width < 1024 ? 'tablet' :
    width < 1920 ? 'desktop' : 'tv';

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop' || breakpoint === 'tv';

  // Card max width based on screen size (for login/register forms)
  const cardMaxWidth =
    isMobile ? width - 48 :
    isTablet ? 480 :
    isDesktop ? 440 : 500;

  // Note grid columns: 1 → 2 → 3 → 4
  const numColumns =
    breakpoint === 'mobile' ? 1 :
    breakpoint === 'tablet' ? 2 :
    breakpoint === 'desktop' ? 3 : 4;

  // Fixed note card width based on columns
  // Container padding = 24px each side (48 total), gap between cards = 12px
  const horizontalPadding = 48;
  const gap = 12;
  const noteCardWidth = (width - horizontalPadding - gap * (numColumns - 1)) / numColumns;

  // Font sizes
  const fontSize = {
    logo: isMobile ? 30 : isTablet ? 36 : 40,
    logoIcon: isMobile ? 46 : isTablet ? 56 : 62,
    cardTitle: isMobile ? 22 : isTablet ? 26 : 28,
    cardSubtitle: isMobile ? 15 : 17,
    input: isMobile ? 15 : 17,
    button: isMobile ? 16 : 18,
    link: isMobile ? 14 : 16,
  };

  // Spacing
  const spacing = {
    cardPadding: isMobile ? 24 : isTablet ? 32 : 40,
    inputVertical: isMobile ? 13 : 15,
    buttonVertical: isMobile ? 14 : 16,
    logoMarginBottom: isMobile ? 24 : 36,
  };

  return {
    width,
    height,
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    cardMaxWidth,
    numColumns,
    noteCardWidth,
    fontSize,
    spacing,
  };
}
