// The homepage used to filter templates in place and keep the filter in the
// URL. Send those old links to the page that replaced each filter.
import { COLLECTIONS } from "./collections.js";

const category = new URLSearchParams(window.location.search).get("category");
const page = COLLECTIONS.find(({ key }) => key === category)?.page;

if (page) window.location.replace(new URL(page, window.location.href));
