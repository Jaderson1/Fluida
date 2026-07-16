export type Breakpoint =
  | 'mobile'
  | 'tablet'
  | 'desktop';

export interface GridLayout {
  readonly columns: number;
}

export interface SpacingLayout {
  readonly page: number;
}

export interface TypographyLayout {
  readonly scale: number;
}

export interface LayoutTokens {
  readonly breakpoint: Breakpoint;
  readonly grid: GridLayout;
  readonly spacing: SpacingLayout;
  readonly typography: TypographyLayout;
}