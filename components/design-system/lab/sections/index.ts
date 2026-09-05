import type { ComponentType } from "react";
import { AlertsSection } from "./alerts";
import { AvatarsSection } from "./avatars";
import { BadgesSection } from "./badges";
import { BreadcrumbsSection } from "./breadcrumbs";
import { ButtonGroupsSection } from "./button-groups";
import { ButtonsSection } from "./buttons";
import { ChoicesSection } from "./choices";
import { ComboboxSection } from "./combobox";
import { CoursemapCardsSection } from "./coursemap-cards";
import { DatePickersSection } from "./date-pickers";
import { DashboardSection } from "./dashboard";
import { DrawersSection } from "./drawers";
import { DropdownsSection } from "./dropdowns";
import { EmptyStatesSection } from "./empty-states";
import { FileUploadSection } from "./file-upload";
import { FoundationsSection } from "./foundations";
import { InputsSection } from "./inputs";
import { LoadingSection } from "./loading";
import { MetricsSection } from "./metrics";
import { ModalsSection } from "./modals";
import { MultiSelectSection } from "./multi-select";
import { NavigationSection } from "./navigation";
import { NotificationsSection } from "./notifications";
import { PaginationSection } from "./pagination";
import { ProgressSection } from "./progress";
import { reuiSectionContent } from "./reui";
import { SelectsSection } from "./selects";
import { SliderSection } from "./slider";
import { SpacingSection } from "./spacing";
import { TablesSection } from "./tables";
import { TabsSection } from "./tabs";
import { TextareasSection } from "./textareas";
import { TooltipsSection } from "./tooltips";
import { TypographySection } from "./typography";

export const sectionContent: Record<string, ComponentType> = {
  foundations: FoundationsSection,
  typography: TypographySection,
  spacing: SpacingSection,
  buttons: ButtonsSection,
  "button-groups": ButtonGroupsSection,
  badges: BadgesSection,
  avatars: AvatarsSection,
  inputs: InputsSection,
  textareas: TextareasSection,
  selects: SelectsSection,
  combobox: ComboboxSection,
  "multi-select": MultiSelectSection,
  choices: ChoicesSection,
  slider: SliderSection,
  tooltips: TooltipsSection,
  dropdowns: DropdownsSection,
  progress: ProgressSection,
  tabs: TabsSection,
  breadcrumbs: BreadcrumbsSection,
  pagination: PaginationSection,
  "date-pickers": DatePickersSection,
  "file-upload": FileUploadSection,
  alerts: AlertsSection,
  notifications: NotificationsSection,
  modals: ModalsSection,
  drawers: DrawersSection,
  "empty-states": EmptyStatesSection,
  loading: LoadingSection,
  tables: TablesSection,
  metrics: MetricsSection,
  navigation: NavigationSection,
  "coursemap-cards": CoursemapCardsSection,
  dashboard: DashboardSection,
  ...reuiSectionContent,
};
