// Enhanced image optimization utility with WebP support and responsive loading
import { useState, useEffect, useRef, useCallback } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate responsive image URLs
  const generateResponsiveSrc = useCallback((originalSrc: string, targetWidth?: number) => {
    // For base64 images (fingerprints), return as-is
    if (originalSrc.startsWith('data:')) {
      return originalSrc;
    }

    // For external URLs, try to generate WebP variants if possible
    if (originalSrc.startsWith('http')) {
      return originalSrc;
    }

    // For local images, generate optimized versions
    const extension = originalSrc.split('.').pop()?.toLowerCase();
    if (extension && ['jpg', 'jpeg', 'png'].includes(extension)) {
      const baseName = originalSrc.replace(/\.[^/.]+$/, '');
      const webpSrc = `${baseName}.webp`;
      
      // Return webp if browser supports it, otherwise original
      return supportsWebP() ? webpSrc : originalSrc;
    }

    return originalSrc;
  }, []);

  // Check WebP support
  const supportsWebP = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }, []);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before image comes into view
        threshold: 0.1
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  // Set image source when in view
  useEffect(() => {
    if (isInView && !imageSrc) {
      const optimizedSrc = generateResponsiveSrc(src, width);
      setImageSrc(optimizedSrc);
    }
  }, [isInView, src, width, imageSrc, generateResponsiveSrc]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
    
    // Fallback to original src if WebP fails
    if (imageSrc.includes('.webp')) {
      setImageSrc(src);
    }
  }, [onError, imageSrc, src]);

  // Generate srcSet for responsive images
  const generateSrcSet = useCallback((baseSrc: string) => {
    if (baseSrc.startsWith('data:') || baseSrc.startsWith('http')) {
      return undefined;
    }

    const extension = baseSrc.split('.').pop()?.toLowerCase();
    if (!extension || !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
      return undefined;
    }

    const baseName = baseSrc.replace(/\.[^/.]+$/, '');
    const ext = supportsWebP() ? 'webp' : extension;

    // Generate different sizes for responsive loading
    const sizes = [400, 800, 1200, 1600];
    return sizes
      .map(size => `${baseName}-${size}w.${ext} ${size}w`)
      .join(', ');
  }, [supportsWebP]);

  const placeholderSrc = placeholder === 'blur' && blurDataURL 
    ? blurDataURL 
    : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+';

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <img
          src={placeholderSrc}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            placeholder === 'blur' ? 'blur-sm' : ''
          }`}
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      {isInView && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          srcSet={generateSrcSet(imageSrc)}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${hasError ? 'hidden' : ''}`}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <span className="text-sm">Failed to load image</span>
        </div>
      )}

      {/* Loading indicator */}
      {!isLoaded && !hasError && isInView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}