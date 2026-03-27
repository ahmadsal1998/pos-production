import React from 'react';
import { APP_DISPLAY_NAME, BRAND_LOGO_SRC } from '@/shared/constants/brand';

const SIZE_PX = { sm: 40, md: 56, lg: 64, xl: 80 } as const;

export type AppBrandLogoSize = keyof typeof SIZE_PX;

interface AppBrandLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: AppBrandLogoSize;
  className?: string;
  /** If false, image is decorative (sidebar next to visible text). */
  decorative?: boolean;
}

/**
 * Renders the supermarket logo; use next to {@link APP_DISPLAY_NAME} where the name should appear.
 */
export const AppBrandLogo: React.FC<AppBrandLogoProps> = ({
  size = 'md',
  className = '',
  decorative = false,
  title,
  ...rest
}) => {
  const px = SIZE_PX[size];
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt={decorative ? '' : APP_DISPLAY_NAME}
      width={px}
      height={px}
      title={title}
      className={`object-contain rounded-2xl shadow-md ring-1 ring-black/5 dark:ring-white/10 ${className}`}
      {...(decorative ? { 'aria-hidden': true as const } : {})}
      {...rest}
    />
  );
};
