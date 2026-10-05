import type { HTMLAttributes, SVGProps } from "react";

import { CITYWALK_BRAND } from "@/lib/brand";

export function CitywalkMark({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="334 220 590 822"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="citywalk-pin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#123852" />
          <stop offset="1" stopColor="#0A2942" />
        </linearGradient>
        <linearGradient id="citywalk-route" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#00B2A7" />
          <stop offset="1" stopColor="#008FA4" />
        </linearGradient>
      </defs>
      <path
        d="M 624 244 L 596 247 L 570 255 L 547 268 L 526 285 L 510 306 L 497 330 L 487 356 L 482 383 L 481 411 L 485 440 L 494 469 L 507 498 L 524 526 L 545 556 L 570 589 L 597 625 L 612 641 L 622 642 L 632 638 L 641 629 L 669 592 L 693 559 L 714 529 L 731 501 L 744 474 L 753 447 L 758 421 L 758 393 L 754 366 L 745 340 L 732 316 L 715 294 L 694 275 L 671 260 L 647 250 Z M 625 325 L 607 327 L 591 334 L 578 345 L 568 359 L 563 375 L 563 392 L 568 407 L 578 421 L 591 432 L 607 438 L 624 440 L 641 437 L 656 430 L 669 419 L 678 405 L 682 389 L 681 372 L 675 357 L 665 343 L 652 333 L 642 329 Z"
        fill="url(#citywalk-pin)"
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <path
        d="M 714 579 L 732 581 L 751 584 L 770 588 L 789 594 L 808 601 L 826 610 L 842 620 L 856 631 L 866 642 L 872 653 L 874 665 L 872 676 L 865 688 L 853 699 L 837 709 L 817 719 L 793 728 L 766 736 L 736 743 L 704 749 L 670 755 L 634 761 L 597 768 L 559 776 L 522 785 L 486 796 L 453 809 L 424 823 L 401 839 L 383 856 L 370 874 L 363 894 L 361 914 L 365 934 L 374 953 L 389 971 L 409 987 L 433 1001 L 461 1012 L 491 1020 L 522 1025 L 551 1027 L 575 1024 L 594 1018 L 606 1009 L 609 998 L 604 988 L 592 978 L 574 968 L 552 956 L 530 943 L 513 929 L 501 914 L 495 899 L 495 884 L 502 868 L 516 853 L 536 838 L 561 824 L 590 811 L 622 800 L 656 791 L 691 783 L 726 776 L 760 769 L 791 762 L 818 754 L 840 745 L 857 735 L 868 724 L 871 713 L 868 703 L 858 694 L 842 687 L 822 681 L 799 675 L 775 668 L 752 661 L 733 654 L 719 647 L 710 639 L 708 631 L 711 622 L 719 614 L 730 608 L 742 605 L 750 605 L 741 599 L 730 592 Z"
        fill="url(#citywalk-route)"
      />
    </svg>
  );
}

type CitywalkLogoProps = Readonly<{
  markOnly?: boolean;
  markClassName?: string;
  wordmarkClassName?: string;
}> & HTMLAttributes<HTMLSpanElement>;

export function CitywalkLogo({
  markOnly = false,
  className,
  markClassName,
  wordmarkClassName,
  ...props
}: CitywalkLogoProps) {
  return (
    <span
      className={className}
      aria-label={markOnly ? CITYWALK_BRAND.name : undefined}
      {...props}
    >
      <CitywalkMark className={markClassName} />
      {markOnly ? null : (
        <span className={wordmarkClassName}>{CITYWALK_BRAND.name}</span>
      )}
    </span>
  );
}
