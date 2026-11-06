import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

// 24px outline icons, 1.6 stroke, matching the admin icon set.
function Icon({ d, ...props }: IconProps & { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const OverviewIcon = (p: IconProps) => <Icon {...p} d="M4.75 19.25h14.5M6.5 15.5v3.25m3.75-6.5v6.5m3.75-9.75v9.75m3.75-13v13" />;
export const EntriesIcon = (p: IconProps) => (
  <Icon {...p} d="M6.25 3.75h8.5l3 3v13.5H6.25a1.5 1.5 0 0 1-1.5-1.5v-13.5a1.5 1.5 0 0 1 1.5-1.5ZM14.5 3.75v3h3M8 11h6.5M8 15h6.5" />
);
export const KeyIcon = (p: IconProps) => <Icon {...p} d="M14.5 9.5a3 3 0 1 0-.01-.01M12.4 11.6 5 19m0 0h3m-3 0v-3m4.5-1.5 2 2M15.5 6.5a3 3 0 1 1 2 5.3" />;
export const DocsIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M5.25 4h13.5A1.25 1.25 0 0 1 20 5.25v13.5A1.25 1.25 0 0 1 18.75 20H5.25A1.25 1.25 0 0 1 4 18.75V5.25A1.25 1.25 0 0 1 5.25 4ZM8 8h8M8 12h8M8 16h5"
  />
);
export const TeamIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M16 19.5v-1.25A3.25 3.25 0 0 0 12.75 15h-5.5A3.25 3.25 0 0 0 4 18.25v1.25M10 11.5A3.5 3.5 0 1 0 10 4a3.5 3.5 0 0 0 0 7.5ZM16.5 4.25a3.25 3.25 0 0 1 0 6.25M18 14.75a3.25 3.25 0 0 1 2 3v1.75"
  />
);
export const SignOutIcon = (p: IconProps) => <Icon {...p} d="M10 5H6.75A1.75 1.75 0 0 0 5 6.75v10.5A1.75 1.75 0 0 0 6.75 19H10m5-4 3-3m0 0-3-3m3 3H9" />;
export const MenuIcon = (p: IconProps) => <Icon {...p} d="M5 7.5h14M5 12h14M5 16.5h14" />;
export const CloseIcon = (p: IconProps) => <Icon {...p} d="m7 7 10 10M17 7 7 17" />;
export const PlusIcon = (p: IconProps) => <Icon {...p} d="M12 5v14M5 12h14" />;
export const CheckIcon = (p: IconProps) => <Icon {...p} d="m5 12.5 4.5 4.5L19 7.5" />;
export const ChevronUpDownIcon = (p: IconProps) => <Icon {...p} d="m8 9.5 4-4 4 4m-8 5 4 4 4-4" />;
export const ArrowUpRightIcon = (p: IconProps) => <Icon {...p} d="M7 17 17 7m0 0H9m8 0v8" />;
export const ArrowDownRightIcon = (p: IconProps) => <Icon {...p} d="M7 7l10 10m0 0V9m0 8H9" />;
export const SearchIcon = (p: IconProps) => <Icon {...p} d="m20 20-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />;
