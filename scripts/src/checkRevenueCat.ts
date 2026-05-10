import { getUncachableRevenueCatClient } from "./revenueCatClient";
import { listProducts, listOfferings, listEntitlements } from "@replit/revenuecat-sdk";

async function check() {
  const client = await getUncachableRevenueCatClient();
  const projectId = process.env.REVENUECAT_PROJECT_ID!;

  const { data: products } = await listProducts({ client, path: { project_id: projectId }, query: { limit: 20 } });
  console.log("=== PRODUCTS ===");
  console.log(JSON.stringify(products?.items?.map(p => ({
    id: p.id,
    display_name: p.display_name,
    store_identifier: p.store_identifier,
    app_id: p.app_id,
  })), null, 2));

  const { data: offerings } = await listOfferings({ client, path: { project_id: projectId }, query: { limit: 10 } });
  console.log("=== OFFERINGS ===");
  console.log(JSON.stringify(offerings?.items?.map(o => ({
    id: o.id,
    lookup_key: o.lookup_key,
    display_name: o.display_name,
  })), null, 2));

  const { data: entitlements } = await listEntitlements({ client, path: { project_id: projectId }, query: { limit: 10 } });
  console.log("=== ENTITLEMENTS ===");
  console.log(JSON.stringify(entitlements?.items?.map(e => ({
    id: e.id,
    lookup_key: e.lookup_key,
    display_name: e.display_name,
  })), null, 2));
}

check().catch(console.error);
