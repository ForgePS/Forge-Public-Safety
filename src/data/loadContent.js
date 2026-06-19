import globalData from "../../content/global.json";
import homeData from "../../content/home.json";
import productsPageData from "../../content/products-page.json";
import productModulesData from "../../content/product-modules.json";
import addonModulesData from "../../content/addon-modules.json";
import solutionsData from "../../content/solutions.json";
import companyData from "../../content/company.json";
import contactData from "../../content/contact.json";
import resourcesData from "../../content/resources.json";
import footerData from "../../content/footer.json";

export const content = {
  ...globalData,
  ...homeData,
  ...productsPageData,
  ...productModulesData,
  ...addonModulesData,
  ...solutionsData,
  ...companyData,
  ...contactData,
  ...resourcesData,
  ...footerData,
};

export const RMS_APP_URL = content.site.rmsUrl;

export function productHref(product) {
  return product.liveLink ? content.site.rmsUrl : undefined;
}
