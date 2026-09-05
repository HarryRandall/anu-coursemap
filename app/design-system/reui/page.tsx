import { redirect } from "next/navigation";
import { reuiCatalogueCategories } from "@reui/catalogue-data/catalogue.generated";

export default function ReuiCataloguePage() {
  redirect(`/design-system/reui/${reuiCatalogueCategories[0].name}`);
}
