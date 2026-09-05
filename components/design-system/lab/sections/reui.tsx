import type { ComponentType } from "react";
import AlertExample from "@reui/examples/alert";
import AutocompleteExample from "@reui/examples/autocomplete";
import BadgeExample from "@reui/examples/badge";
import CascaderExample from "@reui/examples/cascader";
import CodeBlockExample from "@reui/examples/code-block";
import DataGridExample from "@reui/examples/data-grid";
import DateSelectorExample from "@reui/examples/date-selector";
import EventCalendarExample from "@reui/examples/event-calendar";
import FiltersExample from "@reui/examples/filters";
import FrameExample from "@reui/examples/frame";
import GanttExample from "@reui/examples/gantt";
import IconStackExample from "@reui/examples/icon-stack";
import IconTileExample from "@reui/examples/icon-tile";
import KanbanExample from "@reui/examples/kanban";
import NumberFieldExample from "@reui/examples/number-field";
import PhoneInputExample from "@reui/examples/phone-input";
import RatingExample from "@reui/examples/rating";
import ScrollspyExample from "@reui/examples/scrollspy";
import SortableExample from "@reui/examples/sortable";
import StepperExample from "@reui/examples/stepper";
import TimelineExample from "@reui/examples/timeline";
import TreeExample from "@reui/examples/tree";
import { Example, FidelityNote, Stack } from "../section-frame";

type ReuiSectionDefinition = {
  title: string;
  moduleCount: number;
  Demo: ComponentType;
};

function createReuiSection({
  title,
  moduleCount,
  Demo,
}: ReuiSectionDefinition) {
  return function ReuiSection() {
    return (
      <Stack>
        <FidelityNote>
          {"This is ReUI's upstream Radix example. "}
          {moduleCount === 1 ? (
            <>The source module for this family is</>
          ) : (
            <>All {moduleCount} source modules for this family are</>
          )}{" "}
          available through the isolated <code>@reui/*</code> alias.
        </FidelityNote>
        <Example
          title={`${title} preview`}
          description="Interactive free-source example from the pinned ReUI registry."
          className="overflow-hidden p-0"
        >
          <div className="reui-scope style-nova min-h-64 w-full min-w-0 overflow-auto bg-background p-4 text-foreground md:p-6">
            <div className="flex min-w-0 items-center justify-center">
              <Demo />
            </div>
          </div>
        </Example>
      </Stack>
    );
  };
}

export const reuiSectionContent: Record<string, ComponentType> = {
  "reui-alert": createReuiSection({
    title: "Alert",
    moduleCount: 1,
    Demo: AlertExample,
  }),
  "reui-autocomplete": createReuiSection({
    title: "Autocomplete",
    moduleCount: 1,
    Demo: AutocompleteExample,
  }),
  "reui-badge": createReuiSection({
    title: "Badge",
    moduleCount: 1,
    Demo: BadgeExample,
  }),
  "reui-cascader": createReuiSection({
    title: "Cascader",
    moduleCount: 11,
    Demo: CascaderExample,
  }),
  "reui-code-block": createReuiSection({
    title: "Code block",
    moduleCount: 2,
    Demo: CodeBlockExample,
  }),
  "reui-data-grid": createReuiSection({
    title: "Data grid",
    moduleCount: 12,
    Demo: DataGridExample,
  }),
  "reui-date-selector": createReuiSection({
    title: "Date selector",
    moduleCount: 1,
    Demo: DateSelectorExample,
  }),
  "reui-event-calendar": createReuiSection({
    title: "Event calendar",
    moduleCount: 13,
    Demo: EventCalendarExample,
  }),
  "reui-filters": createReuiSection({
    title: "Filters",
    moduleCount: 14,
    Demo: FiltersExample,
  }),
  "reui-frame": createReuiSection({
    title: "Frame",
    moduleCount: 1,
    Demo: FrameExample,
  }),
  "reui-gantt": createReuiSection({
    title: "Gantt",
    moduleCount: 9,
    Demo: GanttExample,
  }),
  "reui-icon-stack": createReuiSection({
    title: "Icon stack",
    moduleCount: 1,
    Demo: IconStackExample,
  }),
  "reui-icon-tile": createReuiSection({
    title: "Icon tile",
    moduleCount: 1,
    Demo: IconTileExample,
  }),
  "reui-kanban": createReuiSection({
    title: "Kanban",
    moduleCount: 1,
    Demo: KanbanExample,
  }),
  "reui-number-field": createReuiSection({
    title: "Number field",
    moduleCount: 1,
    Demo: NumberFieldExample,
  }),
  "reui-phone-input": createReuiSection({
    title: "Phone input",
    moduleCount: 1,
    Demo: PhoneInputExample,
  }),
  "reui-rating": createReuiSection({
    title: "Rating",
    moduleCount: 1,
    Demo: RatingExample,
  }),
  "reui-scrollspy": createReuiSection({
    title: "Scrollspy",
    moduleCount: 1,
    Demo: ScrollspyExample,
  }),
  "reui-sortable": createReuiSection({
    title: "Sortable",
    moduleCount: 1,
    Demo: SortableExample,
  }),
  "reui-stepper": createReuiSection({
    title: "Stepper",
    moduleCount: 1,
    Demo: StepperExample,
  }),
  "reui-timeline": createReuiSection({
    title: "Timeline",
    moduleCount: 1,
    Demo: TimelineExample,
  }),
  "reui-tree": createReuiSection({
    title: "Tree",
    moduleCount: 1,
    Demo: TreeExample,
  }),
};
