export type Breakpoint =
  | 'mobile'
  | 'tablet'
  | 'desktop';

export type Breakpoints =
  Readonly<Record<Breakpoint, number>>;

export interface GridLayout {
  readonly columns: number;
}

export interface SpacingLayout {
  readonly page: number;
}

export interface TypographyLayout {
  readonly scale: number;
}

export interface TypographyConfig {
  readonly minimumWidth?: number;
  readonly maximumWidth?: number;
  readonly minimumScale?: number;
  readonly maximumScale?: number;
}

export interface SpacingConfig {
  readonly minimumWidth?: number;
  readonly maximumWidth?: number;
  readonly minimumPadding?: number;
  readonly maximumPadding?: number;
}

export interface ContainerTier {
  readonly minimumWidth: number;
  readonly containerMaxWidth: number;
}

export interface ContainerLayout {
  readonly maxWidth: number;
}

export interface ContainerConfig {
  readonly tiers?: readonly ContainerTier[];
}

export interface LayoutTokens {
  readonly breakpoint: Breakpoint;

  readonly grid: GridLayout;

  readonly spacing: SpacingLayout;

  readonly typography: TypographyLayout;

  readonly container: ContainerLayout;
}

export interface EngineConfig {
  readonly breakpoints?: Breakpoints;
  readonly spacing?: SpacingConfig;
  readonly typography?: TypographyConfig;
  readonly container?: ContainerConfig;
}