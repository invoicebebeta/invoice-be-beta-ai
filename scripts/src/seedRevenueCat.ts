import { getUncachableRevenueCatClient } from './revenueCatClient.js';

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from '@replit/revenuecat-sdk';

const PROJECT_NAME = 'Invoice Be Beta AI';

const APP_STORE_APP_NAME = 'Invoice Be Beta AI iOS';
const APP_STORE_BUNDLE_ID = 'com.invoicebebeta.app';
const PLAY_STORE_APP_NAME = 'Invoice Be Beta AI Android';
const PLAY_STORE_PACKAGE_NAME = 'com.invoicebebeta.app';

const ENTITLEMENT_IDENTIFIER = 'pro';
const ENTITLEMENT_DISPLAY_NAME = 'Pro Access';

const OFFERING_IDENTIFIER = 'default';
const OFFERING_DISPLAY_NAME = 'Default Offering';

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

const PRODUCTS = [
  {
    identifier: 'pro_monthly',
    playStoreIdentifier: 'pro_monthly:monthly',
    displayName: 'Pro Monthly',
    userFacingTitle: 'Pro Monthly',
    duration: 'P1M' as const,
    packageIdentifier: '$rc_monthly',
    packageDisplayName: 'Monthly Subscription',
    prices: [
      { amount_micros: 4990000, currency: 'GBP' },
      { amount_micros: 4990000, currency: 'USD' },
      { amount_micros: 4990000, currency: 'EUR' },
    ],
  },
  {
    identifier: 'pro_yearly',
    playStoreIdentifier: 'pro_yearly:yearly',
    displayName: 'Pro Yearly',
    userFacingTitle: 'Pro Yearly',
    duration: 'P1Y' as const,
    packageIdentifier: '$rc_annual',
    packageDisplayName: 'Yearly Subscription',
    prices: [
      { amount_micros: 39990000, currency: 'GBP' },
      { amount_micros: 39990000, currency: 'USD' },
      { amount_micros: 39990000, currency: 'EUR' },
    ],
  },
];

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error('Failed to list projects');

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log('Project already exists:', existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error('Failed to create project');
    console.log('Created project:', newProject.id);
    project = newProject;
  }

  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error('No apps found');

  let testStoreApp: App | undefined = apps.items.find((a) => a.type === 'test_store');
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === 'app_store');
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === 'play_store');

  if (!testStoreApp) throw new Error('No test store app found');
  console.log('Test store app found:', testStoreApp.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: 'app_store', app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error('Failed to create App Store app');
    appStoreApp = newApp;
    console.log('Created App Store app:', appStoreApp.id);
  } else {
    console.log('App Store app found:', appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: 'play_store', play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error('Failed to create Play Store app');
    playStoreApp = newApp;
    console.log('Created Play Store app:', playStoreApp.id);
  } else {
    console.log('Play Store app found:', playStoreApp.id);
  }

  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error('Failed to list products');

  const ensureProduct = async (targetApp: App, label: string, productIdentifier: string, isTestStore: boolean, displayName: string, userFacingTitle: string, duration: 'P1M' | 'P1Y'): Promise<Product> => {
    const existing = existingProducts.items?.find((p) => p.store_identifier === productIdentifier && p.app_id === targetApp.id);
    if (existing) {
      console.log(label + ' product already exists:', existing.id);
      return existing;
    }
    const body: CreateProductData['body'] = {
      store_identifier: productIdentifier,
      app_id: targetApp.id,
      type: 'subscription',
      display_name: displayName,
    };
    if (isTestStore) {
      body.subscription = { duration };
      body.title = userFacingTitle;
    }
    const { data: created, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) throw new Error('Failed to create ' + label + ' product: ' + JSON.stringify(error));
    console.log('Created ' + label + ' product:', created.id);
    return created;
  };

  let entitlement: Entitlement | undefined;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error('Failed to list entitlements');

  const existingEntitlement = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existingEntitlement) {
    console.log('Entitlement already exists:', existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data: newEntitlement, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error('Failed to create entitlement');
    console.log('Created entitlement:', newEntitlement.id);
    entitlement = newEntitlement;
  }

  let offering: Offering | undefined;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error('Failed to list offerings');

  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log('Offering already exists:', existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOffering, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error('Failed to create offering');
    console.log('Created offering:', newOffering.id);
    offering = newOffering;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error('Failed to set offering as current');
    console.log('Set offering as current');
  }

  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error('Failed to list packages');

  for (const productDef of PRODUCTS) {
    console.log('\n--- Processing product:', productDef.identifier, '---');

    const testProd = await ensureProduct(testStoreApp, 'Test Store ' + productDef.identifier, productDef.identifier, true, productDef.displayName, productDef.userFacingTitle, productDef.duration);
    const appStoreProd = await ensureProduct(appStoreApp, 'App Store ' + productDef.identifier, productDef.identifier, false, productDef.displayName, productDef.userFacingTitle, productDef.duration);
    const playStoreProd = await ensureProduct(playStoreApp, 'Play Store ' + productDef.identifier, productDef.playStoreIdentifier, false, productDef.displayName, productDef.userFacingTitle, productDef.duration);

    console.log('Adding test store prices for:', productDef.identifier);
    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: '/projects/{project_id}/products/{product_id}/test_store_prices',
      path: { project_id: project.id, product_id: testProd.id },
      body: { prices: productDef.prices },
    });
    if (priceError) {
      if (typeof priceError === 'object' && 'type' in priceError && priceError['type'] === 'resource_already_exists') {
        console.log('Test store prices already exist');
      } else {
        console.warn('Price warning:', JSON.stringify(priceError));
      }
    } else {
      console.log('Added test store prices');
    }

    const { error: attachEntErr } = await attachProductsToEntitlement({
      client,
      path: { project_id: project.id, entitlement_id: entitlement.id },
      body: { product_ids: [testProd.id, appStoreProd.id, playStoreProd.id] },
    });
    if (attachEntErr) {
      if (attachEntErr.type === 'unprocessable_entity_error') {
        console.log('Products already attached to entitlement');
      } else {
        throw new Error('Failed to attach products to entitlement: ' + JSON.stringify(attachEntErr));
      }
    } else {
      console.log('Attached products to entitlement');
    }

    let pkg: Package | undefined;
    const existingPkg = existingPackages.items?.find((p) => p.lookup_key === productDef.packageIdentifier);
    if (existingPkg) {
      console.log('Package already exists:', existingPkg.id);
      pkg = existingPkg;
    } else {
      const { data: newPkg, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: offering.id },
        body: { lookup_key: productDef.packageIdentifier, display_name: productDef.packageDisplayName },
      });
      if (error) throw new Error('Failed to create package: ' + JSON.stringify(error));
      console.log('Created package:', newPkg.id);
      pkg = newPkg;
    }

    const { error: attachPkgErr } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: testProd.id, eligibility_criteria: 'all' },
          { product_id: appStoreProd.id, eligibility_criteria: 'all' },
          { product_id: playStoreProd.id, eligibility_criteria: 'all' },
        ],
      },
    });
    if (attachPkgErr) {
      if (attachPkgErr.type === 'unprocessable_entity_error' && attachPkgErr.message?.includes('Cannot attach product')) {
        console.log('Skipping package attach: already has incompatible product');
      } else {
        throw new Error('Failed to attach products to package: ' + JSON.stringify(attachPkgErr));
      }
    } else {
      console.log('Attached products to package');
    }
  }

  const { data: testStoreApiKeys, error: e1 } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: testStoreApp.id } });
  if (e1) throw new Error('Failed to list test store API keys');
  const { data: appStoreApiKeys, error: e2 } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: appStoreApp.id } });
  if (e2) throw new Error('Failed to list App Store API keys');
  const { data: playStoreApiKeys, error: e3 } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: playStoreApp.id } });
  if (e3) throw new Error('Failed to list Play Store API keys');

  console.log('\n====================');
  console.log('RevenueCat setup complete!');
  console.log('Project ID:', project.id);
  console.log('Test Store App ID:', testStoreApp.id);
  console.log('App Store App ID:', appStoreApp.id);
  console.log('Play Store App ID:', playStoreApp.id);
  console.log('Entitlement Identifier:', ENTITLEMENT_IDENTIFIER);
  console.log('Public API Keys - Test Store:', testStoreApiKeys?.items.map((i) => i.key).join(', ') ?? 'N/A');
  console.log('Public API Keys - App Store:', appStoreApiKeys?.items.map((i) => i.key).join(', ') ?? 'N/A');
  console.log('Public API Keys - Play Store:', playStoreApiKeys?.items.map((i) => i.key).join(', ') ?? 'N/A');
  console.log('====================\n');
  console.log('COPY THESE TO ENV VARS:');
  console.log('REVENUECAT_PROJECT_ID=' + project.id);
  console.log('REVENUECAT_TEST_STORE_APP_ID=' + testStoreApp.id);
  console.log('REVENUECAT_APPLE_APP_STORE_APP_ID=' + appStoreApp.id);
  console.log('REVENUECAT_GOOGLE_PLAY_STORE_APP_ID=' + playStoreApp.id);
  console.log('EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=' + (testStoreApiKeys?.items[0]?.key ?? 'N/A'));
  console.log('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=' + (appStoreApiKeys?.items[0]?.key ?? 'N/A'));
  console.log('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=' + (playStoreApiKeys?.items[0]?.key ?? 'N/A'));
}

seedRevenueCat().catch(console.error);
