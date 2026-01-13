import React, { Component } from "react";
import PropTypes from "prop-types";
import cn from "classnames";
import "./Carousel.css";

/** * The threshold that must be exceeded for swipe/wheel actions to trigger page
 * transitions.
 */
const SWIPE_THRESHOLD = 65;

/**
 * A carousel allows multiple pieces of featured content to occupy an allocated
 * amount of space.
 */
export default class Carousel extends Component {
  constructor(props) {
    super(props);
    this.slides = React.createRef();
    this.state = {
      page: 0,
    };
    this.autoRotate = props.autoRotate;
    this.autoRotateTimeoutHandle = 0;
    this.autoRotateInterval = props.autoRotateInterval;
    this.isAnimating = false;
    this.touchStartX = null;
  }

  /**
   * When a series of touch events start, keep track of the initial touch
   * position so that we can calculate how far the user has swiped.
   */
  onTouchStart = ({ touches }) => {
    this.touchStartX = touches[0].clientX;
  };

  /**
   * Track the swipe action, and when it passed the threshold trigger a
   * transition to the next or previous page, as appropriate.
   */
  onTouchMove = ({ touches }) => {
    const current = touches[0].clientX;
    if (this.touchStartX !== null && current !== null) {
      const delta = current - this.touchStartX;
      if (delta > SWIPE_THRESHOLD) {
        this.touchStartX = null;
        this.requestPreviousPage();
      } else if (delta < -SWIPE_THRESHOLD) {
        this.touchStartX = null;
        this.requestNextPage();
      }
    }
  };

  /**
   * The user has finished swiping, so there's no need to track the swipe start
   * position any longer.
   */
  onTouchEnd = () => {
    this.touchStartX = null;
  };

  /**
   * Wheel events are fired when the user spins a mouse wheel, but in that
   * scenario it'll be ignored, since it doesn't make sense to transition the
   * carousel when scrolling vertically. However, MacOS also fires wheel events
   * when scrolling horizontally.
   */
  onWheel = (e) => {
    if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) {
      e.preventDefault();
      if (!this.isAnimating) {
        e.deltaX < -SWIPE_THRESHOLD && this.requestPreviousPage();
        e.deltaX > SWIPE_THRESHOLD && this.requestNextPage();
      }
    }
  };

  /**
   * Due to the inertia effect of MacOS scrolling the delta can remain above
   * the threshold for some time, so we set an `isAnimating` flag when a page
   * transition happens, then wait for it to finish before clearing the flag,
   * permitting another transition to occur.
   */
  onTransitionEnd = (event) => {
    if (event.target === this.slides.current) {
      this.isAnimating = false;
    }
  };

  /**
   * Track the presence of the mouse point over the carousel, and only permit
   * wheel events to trigger page transitions when it is.
   */
  onMouseEnter = () => {
    this.cancelAutoRotate();
    window.addEventListener("wheel", this.onWheel, { passive: false });
  };

  onMouseLeave = () => {
    this.startAutoRotate();
    window.removeEventListener("wheel", this.onWheel);
  };

  /**
   * Refresh the page if the number of cards in the carousel has changed.
   */
  componentDidUpdate(prevProps) {
    if (prevProps.children.length !== this.props.children.length) {
      this.refreshPage();
    }
  }

  /**
   * Request the carousel display a specific page. Note: this does not
   * guarantee that the requested page will be displayed.
   */
  requestPage(requestedPage) {
    const { children } = this.props;
    const { page: currentPage } = this.state;
    const { scrollWidth, offsetWidth } = this.slides.current;

    // Determine how many slides and pages there are.
    const slideCount = children.length;
    // Subtracting a 1% variance results in a more accurate page count.
    const pageCount = Math.ceil((scrollWidth / offsetWidth) - 0.01);
    const slidesPerPage = Math.round((offsetWidth * slideCount) / scrollWidth);

    // Clip the requested page to the range of valid pages.
    const newPage = Math.min(pageCount - 1, Math.max(0, requestedPage));

    // Set the `isAnimating` flag, to prevent further transitions.
    this.isAnimating = newPage !== currentPage;

    this.setState({
      page: newPage,
      pageCount,
      slidesPerPage,
    });
  }

  /**
   * Request the next page be displayed.
   */
  requestNextPage = () => {
    this.requestPage(this.state.page + 1);
  };

  /**
   * Request the previous page be displayed.
   */
  requestPreviousPage = () => {
    this.requestPage(this.state.page - 1);
  };

  requestRotatePage = () => {
    this.requestPage((this.state.page + 1) % this.state.pageCount);
  };

  /**
   * Refresh the current page, which will trigger a transition if the current
   * page is invalid (which may be the case after a resize).
   */
  refreshPage = () => {
    this.requestPage(this.state.page);
  };

  /**
   * When the viewport has been resized, the current page may no longer be
   * valid, so force a refresh.
   */
  onResize = () => {
    this.refreshPage();
  };

  /**
   * Setup resize listeners and trigger an initial refresh.
   */
  componentDidMount() {
    window.addEventListener("resize", this.onResize);
    if (this.autoRotate) {
      this.startAutoRotate();
    }
    this.refreshPage();
  }

  /**
   * Clean up event listeners.
   */
  componentWillUnmount() {
    window.removeEventListener("resize", this.onResize);
    this.cancelAutoRotate();
  }

  startAutoRotate() {
    let { pageCount } = this.props;
    if (!this.autoRotate || pageCount == 0 || !!this.autoRotateTimeoutHandle)
      return;

    const self = this;
    const autoRotateFunction = () => {
      let newPage = (self.state.page + 1) % self.state.pageCount;
      self.setState({ page: newPage });
      self.autoRotateTimeoutHandle = setTimeout(
        autoRotateFunction,
        self.autoRotateInterval
      );
    };
    self.autoRotateTimeoutHandle = setTimeout(
      autoRotateFunction,
      self.autoRotateInterval
    );
  }

  cancelAutoRotate() {
    if (!this.autoRotate || !this.autoRotateTimeoutHandle) return;
    clearTimeout(this.autoRotateTimeoutHandle);
    this.autoRotateTimeoutHandle = 0;
  }

  /**
   * Render one of the previous/next buttons.
   */
  renderArrowButton(title, icon, onClick, isDisabled) {
    const { id } = this.props;

    return (
      <span
        className={`c-carousel__controls c-carousel__controls--${title.toLowerCase()}`}
      >
        <button
          onClick={onClick}
          aria-controls={id}
          aria-label={title}
          className="c-carousel__btn"
          disabled={isDisabled}
          style={{ visibility: isDisabled ? 'hidden' : 'visible' }}
        >
          <svg
            className="c-icon c-icon--large"
            role="img"
            aria-labelledby={`${title}-icon`}
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <title id={`${title}-icon`}>{title}</title>
            {icon === 'arrow-left' ? (
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            ) : (
              <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
            )}
          </svg>
        </button>
      </span>
    );
  }

  /**
   * Render indicators showing the non-current and current pages.
   */
  renderIndicators() {
    const { page: currentPage, pageCount } = this.state;
    const indicators = [];
    const self = this;

    for (let page = 0; page < pageCount; page++) {
      const isCurrentPage = page == currentPage;
      const indicatorClassName = cn({
        "c-carousel__indicator-active": isCurrentPage,
      });
      indicators.push(
        <li
          key={page}
          datapage={page}
          className={indicatorClassName}
          aria-label={"Go to page " + page}
          onClick={() => {
            self.requestPage(page);
          }}
        ></li>
      );
    }

    return (
      <div className="c-carousel__indicators">
        <ol>{indicators}</ol>
      </div>
    );
  }

  /**
   * Render all of the slides (not just the current page of slides) with aria
   * attributes set accordingly to hide slides that are not on the current
   * page.
   */
  renderSlides(swipeOffset) {
    const { children, slides, carouselOverlap } = this.props;
    const { page, slidesPerPage } = this.state;
    const firstVisibleSlide = page * slidesPerPage;
    const lastVisibleSlide = firstVisibleSlide + slidesPerPage - 1;

    const slidesClassName = cn("o-list-inline", "c-carousel__slides", {
      "u-transition-none": swipeOffset !== 0,
      " no-overlap": !carouselOverlap,
    });

    const slideClassName = cn(
      "c-carousel__slide",
      `u-1/${slides["mobile"]}`,
      `u-1/${slides["mobileLandscape"]}@mobile-landscape`,
      `u-1/${slides["tablet"]}@tablet`,
      `u-1/${slides["tabletLandscape"]}@tablet-landscape`,
      `u-1/${slides["desktop"]}@desktop`
    );

    const slidesStyle = {
      transform: `translateX(-${page * 100}%)`,
    };

    return (
      <ol
        className={slidesClassName}
        ref={this.slides}
        style={slidesStyle}
        onTransitionEnd={this.onTransitionEnd}
      >
        {React.Children.map(children, (child, key) => {
          const isVisible =
            key >= firstVisibleSlide && key <= lastVisibleSlide;
          const fullSlideClassName = cn(slideClassName, {
            " is-invisible": !isVisible,
            " no-overlap": !carouselOverlap,
          });
          return (
            <li
              key={key}
              className={fullSlideClassName}
              aria-hidden={!isVisible}
            >
              {child}
            </li>
          );
        })}
      </ol>
    );
  }

  /**
   * Render the Carousel controls and the slides.
   */
  render() {
    const { className, id } = this.props;
    const { page, pageCount } = this.state;

    const isFirstPage = page === 0;
    const isLastPage = page === pageCount - 1;

    return (
      <div
        id={id}
        className={cn("c-carousel", className)}
        aria-live="polite"
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onTouchCancel={this.onTouchEnd}
        onTouchEnd={this.onTouchEnd}
        onTouchMove={this.onTouchMove}
        onTouchStart={this.onTouchStart}
      >
        {this.renderArrowButton(
          "Previous",
          "arrow-left",
          this.requestPreviousPage,
          isFirstPage
        )}
        {this.renderArrowButton(
          "Next",
          "arrow-right",
          this.requestNextPage,
          isLastPage
        )}
        <div className="c-carousel__viewport">{this.renderSlides(0)}</div>
        {this.props.indicator && this.renderIndicators()}
      </div>
    );
  }
}

Carousel.propTypes = {
  autoRotate: PropTypes.bool,
  autoRotateInterval: PropTypes.number,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  id: PropTypes.string.isRequired,
  indicator: PropTypes.bool,
  slides: PropTypes.shape({
    mobile: PropTypes.number,
    mobileLandscape: PropTypes.number,
    tablet: PropTypes.number,
    tabletLandscape: PropTypes.number,
    desktop: PropTypes.number,
  }),
};

Carousel.defaultProps = {
  autoRotate: false,
  autoRotateInterval: 5000,
  className: "",
  indicator: true,
  slides: {
    mobile: 1,
    mobileLandscape: 1,
    tablet: 1,
    tabletLandscape: 1,
    desktop: 1,
  },
};
