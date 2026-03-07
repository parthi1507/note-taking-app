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

  // Card max width based on screen size
  const cardMaxWidth =
    isMobile ? width - 48 :
    isTablet ? 480 :
    isDesktop ? 440 : 500;

  // Font sizes
  const fontSize = {
    logo: isMobile ? 28 : isTablet ? 34 : 38,
    logoIcon: isMobile ? 44 : isTablet ? 54 : 60,
    cardTitle: isMobile ? 20 : isTablet ? 24 : 26,
    cardSubtitle: isMobile ? 13 : 15,
    input: isMobile ? 14 : 16,
    button: isMobile ? 15 : 17,
    link: isMobile ? 13 : 15,
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
    fontSize,
    spacing,
  };
}
