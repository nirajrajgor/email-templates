const SCROLL_SPEED = 110;
const OVERFLOW_THRESHOLD = 8;

const prefersReducedMotion =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Only the hover scroll is motion-gated; sizing always runs.
{
  const cards = document.querySelectorAll("main article.wrapper");

  cards.forEach((card) => {
    const container = card.querySelector('div[class*="aspect-"]');
    const image = container?.querySelector("img");
    if (!container || !image) return;

    // Cover would crop the email's own margins, so remove it once.
    image.classList.remove("object-cover");

    let cleanupTimer;
    let scrollDelta = 0;

    const resetScroll = () => {
      image.style.transition = "transform .6s ease-out";
      image.style.transform = "translateY(0)";
      clearTimeout(cleanupTimer);
      cleanupTimer = setTimeout(() => {
        image.style.willChange = "auto";
      }, 700);
    };

    const syncPreview = () => {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const imageWidth = image.naturalWidth;
      const imageHeight = image.naturalHeight;
      if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) {
        return false;
      }

      const displayedHeight = imageHeight * (containerWidth / imageWidth);
      scrollDelta = Math.max(0, displayedHeight - containerHeight);
      const isScrollable = scrollDelta >= OVERFLOW_THRESHOLD;

      image.classList.toggle("h-full", !isScrollable);
      image.classList.toggle("h-auto", isScrollable);
      image.classList.toggle("object-contain", !isScrollable);
      container.dataset.previewScrollable = String(isScrollable);

      if (!isScrollable) resetScroll();
      return isScrollable;
    };

    const startScroll = () => {
      if (!image.complete) {
        image.addEventListener("load", startScroll, { once: true });
        return;
      }
      if (!syncPreview()) return;

      const duration = scrollDelta / SCROLL_SPEED;
      image.style.willChange = "transform";
      image.style.transition = `transform ${duration}s linear`;
      image.style.transform = `translateY(-${scrollDelta}px)`;
    };

    container.style.overflow = "hidden";
    // A swapped source must re-evaluate fit without a container resize.
    image.addEventListener("load", syncPreview);
    if (image.complete) syncPreview();

    new ResizeObserver(syncPreview).observe(container);

    if (prefersReducedMotion) return;
    container.addEventListener("mouseenter", startScroll);
    container.addEventListener("mouseleave", resetScroll);
    container.addEventListener("touchstart", startScroll, { passive: true });
    container.addEventListener("touchend", resetScroll, { passive: true });
  });
}
