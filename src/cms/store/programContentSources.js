import globalData from "../../../content/global.json";
import homeData from "../../../content/home.json";
import productsPageData from "../../../content/products-page.json";
import productModulesData from "../../../content/product-modules.json";
import productLinesData from "../../../content/product-lines.json";
import addonModulesData from "../../../content/addon-modules.json";
import solutionsData from "../../../content/solutions.json";
import companyData from "../../../content/company.json";
import contactData from "../../../content/contact.json";
import resourcesData from "../../../content/resources.json";
import footerData from "../../../content/footer.json";
import mediaData from "../../../content/media.json";

import rmsGlobal from "../../../content/programs/forge-rms/global.json";
import rmsHome from "../../../content/programs/forge-rms/home.json";
import rmsProductsPage from "../../../content/programs/forge-rms/products-page.json";
import rmsProductModules from "../../../content/programs/forge-rms/product-modules.json";
import rmsAddonModules from "../../../content/programs/forge-rms/addon-modules.json";
import rmsCompany from "../../../content/programs/forge-rms/company.json";
import rmsContact from "../../../content/programs/forge-rms/contact.json";
import rmsResources from "../../../content/programs/forge-rms/resources.json";
import rmsFooter from "../../../content/programs/forge-rms/footer.json";

import academyGlobal from "../../../content/programs/forge-academy/global.json";
import academyHome from "../../../content/programs/forge-academy/home.json";
import academyProductsPage from "../../../content/programs/forge-academy/products-page.json";
import academyProductModules from "../../../content/programs/forge-academy/product-modules.json";
import academyAddonModules from "../../../content/programs/forge-academy/addon-modules.json";
import academyCompany from "../../../content/programs/forge-academy/company.json";
import academyContact from "../../../content/programs/forge-academy/contact.json";
import academyResources from "../../../content/programs/forge-academy/resources.json";
import academyFooter from "../../../content/programs/forge-academy/footer.json";

import industrialGlobal from "../../../content/programs/forge-industrial-survey/global.json";
import industrialHome from "../../../content/programs/forge-industrial-survey/home.json";
import industrialProductsPage from "../../../content/programs/forge-industrial-survey/products-page.json";
import industrialProductModules from "../../../content/programs/forge-industrial-survey/product-modules.json";
import industrialAddonModules from "../../../content/programs/forge-industrial-survey/addon-modules.json";
import industrialSolutions from "../../../content/programs/forge-industrial-survey/solutions.json";
import industrialCompany from "../../../content/programs/forge-industrial-survey/company.json";
import industrialContact from "../../../content/programs/forge-industrial-survey/contact.json";
import industrialResources from "../../../content/programs/forge-industrial-survey/resources.json";
import industrialFooter from "../../../content/programs/forge-industrial-survey/footer.json";

const MARKETING_CONTENT = {
  global: globalData,
  home: homeData,
  productsPage: productsPageData,
  productModules: productModulesData,
  productLines: productLinesData,
  addonModules: addonModulesData,
  solutions: solutionsData,
  company: companyData,
  contact: contactData,
  resources: resourcesData,
  footer: footerData,
  media: mediaData,
};

export const PROGRAM_CONTENT_SOURCES = {
  "forge-marketing": MARKETING_CONTENT,
  "forge-rms": {
    global: rmsGlobal,
    home: rmsHome,
    productsPage: rmsProductsPage,
    productModules: rmsProductModules,
    addonModules: rmsAddonModules,
    company: rmsCompany,
    contact: rmsContact,
    resources: rmsResources,
    footer: rmsFooter,
  },
  "forge-academy": {
    global: academyGlobal,
    home: academyHome,
    productsPage: academyProductsPage,
    productModules: academyProductModules,
    addonModules: academyAddonModules,
    company: academyCompany,
    contact: academyContact,
    resources: academyResources,
    footer: academyFooter,
  },
  "forge-industrial-survey": {
    global: industrialGlobal,
    home: industrialHome,
    productsPage: industrialProductsPage,
    productModules: industrialProductModules,
    addonModules: industrialAddonModules,
    solutions: industrialSolutions,
    company: industrialCompany,
    contact: industrialContact,
    resources: industrialResources,
    footer: industrialFooter,
  },
};

export function getProgramContentSource(programId) {
  return PROGRAM_CONTENT_SOURCES[programId] || null;
}

export function hasBundledContent(programId) {
  return Boolean(PROGRAM_CONTENT_SOURCES[programId]);
}

export function listImportablePrograms() {
  return Object.keys(PROGRAM_CONTENT_SOURCES);
}
