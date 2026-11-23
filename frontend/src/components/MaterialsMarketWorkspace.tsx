"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShoppingBag,
  Truck,
  MapPin,
  Navigation,
  Star,
  Info,
  CheckCircle2,
  ExternalLink,
  FileText,
  Scale,
  Package,
  SlidersHorizontal,
  Building2,
  MessageSquarePlus,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  ShieldAlert,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Store,
  Globe,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api/client";
import { DEFAULT_MIX } from "@/lib/constants/mixDefaults";

interface CountryRow {
  country_code: string;
  country_name: string;
  region?: string | null;
  subregion?: string | null;
  display_currency: string;
  coverage_status: string;
  market_Display_mode?: string | null;
  refreshed_50_pack?: number;
  supplier_count?: number;
  verified_branch_count?: number;
  price_snapshot_count: number;
  benchmark_reference_count: number;
  live_inventory_connected: number;
  live_supplier_quote_count: number;
  source_observed_at: string | null;
  notes: string | null;
}

interface MarketOverviewResponse {
  coverage: {
    country_count: number;
    refreshed_50_country_count?: number;
    countries_with_price_snapshots: number;
    supplier_count: number;
    verified_branch_count: number;
    mapped_branch_seed_count?: number;
    price_snapshot_count: number;
    live_confirmed_quote_count: number;
    benchmark_reference_count: number;
    verified_review_count: number;
    source_count: number;
    global_50_supplier_count?: number;
    global_50_branch_count?: number;
    geonames_Memory_cities_count?: number;
  };
  countries: CountryRow[];
  geonames_attribution?: {
    source_name: string;
    license: string;
    url: string;
    text: string;
  };
  disclaimers: string[];
}

interface LocationSuggestion {
  id: string;
  geoname_id?: number;
  name: string;
  ascii_name?: string;
  country_code: string;
  country_name: string;
  admin1_code?: string;
  admin1_name?: string;
  latitude: number;
  longitude: number;
  population?: number;
  feature_code?: string;
  timezone?: string;
  display_label: string;
}

interface LocationSuggestResponse {
  country_code: string;
  country_name: string | null;
  query: string;
  count: number;
  suggestions: LocationSuggestion[];
  attribution: {
    source_name: string;
    license: string;
    url: string;
    text: string;
  };
}

interface EvaluatedLineItem {
  price_id: string;
  product_name: string;
  product_category: string;
  currency: string;
  original_amount: string | null;
  original_unit: string | null;
  amount_min?: string | null;
  amount_max?: string | null;
  is_price_range?: boolean;
  price_min?: string | null;
  price_max?: string | null;
  required_kg: string;
  purchased_kg: string | null;
  surplus_kg: string | null;
  bags_needed: number | null;
  package_count?: number | null;
  package_quantity_kg?: number | null;
  normalized_unit_price?: string | null;
  material_subtotal: string | null;
  delivery_fee: string | null;
  vat_amount: string | null;
  delivered_total: string | null;
  reference_subtotal?: string | null;
  is_complete_total: boolean;
  is_ambiguous_unit?: boolean;
  pricing_warning?: string | null;
  quote_completeness: string;
  missing_cost_components: string[];
  tier_notes?: string[];
  notes: string[];
}

interface MarketOffer {
  supplier_id: string;
  price_id?: string;
  display_name: string;
  product_name?: string;
  product_category?: string;
  country_code: string;
  record_type: string;
  discovery_tier?: string;
  discovery_tier_label?: string;
  commercial_status: string;
  verification_role?: string;
  channel_type?: string;
  price_status?: string;
  price_status_label?: string;
  availability?: {
    status: string;
    label: string;
    badge_tone?: string;
    scope_note?: string;
  };
  availability_status?: string;
  availability_badge?: string;
  availability_scope_note?: string;
  stock_availability_note?: string;
  is_price_range?: boolean;
  amount_min?: string | null;
  amount_max?: string | null;
  price_min?: string | null;
  price_max?: string | null;
  product_categories_confirmed: string[];
  source_url?: string | null;
  sources: Array<{
    source_id: string;
    title?: string;
    url?: string;
    publisher?: string;
  }>;
  distance_km: number | null;
  distance_label: string;
  distance_mode: string | null;
  review_summary: {
    review_count: number;
    mean_overall_rating: number | null;
    mean_service_rating: number | null;
    mean_material_rating: number | null;
    bayesian_score: number | null;
    label: string;
  };
  quote_completeness: string;
  is_complete_total: boolean;
  is_ambiguous_unit?: boolean;
  pricing_warning?: string | null;
  currency: string | null;
  original_amount?: string | null;
  original_unit?: string | null;
  package_quantity_kg?: number | null;
  package_count?: number | null;
  bags_needed?: number | null;
  normalized_unit_price?: string | null;
  normalized_price_per_m3?: string | null;
  delivered_total: string | null;
  reference_subtotal: string | null;
  missing_cost_components: string[];
  covered_basket_items?: number;
  requested_basket_items?: number;
  missing_basket_items?: string[];
  line_items: EvaluatedLineItem[];
  dispatch_breakdown?: {
    ordered_volume_m3: string;
    truck_capacity_m3: string;
    truck_count: number;
    load_volumes_m3: string[];
    base_material_subtotal: string;
    small_load_fee: string;
    delivery_fee: string;
    pump_fee: string;
    subtotal_ex_vat: string;
    vat_amount: string;
    total_inc_vat: string;
  } | null;
  freshness: {
    score: number;
    label: string;
  };
  notes: string[];
  recommendation_badge?: string;
  recommendation_explanation?: string;
  recommendation_breakdown?: {
    composite_score: number;
    eligible_for_complete_recommendation: boolean;
    configured_weights: Record<string, number>;
    active_weights: Record<string, number>;
    components: Record<string, number | null>;
  };
}

interface LocalBranchCard {
  branch_id: string;
  supplier_id: string | null;
  display_name?: string;
  branch_name?: string;
  brand?: string | null;
  location_role?: string;
  location_role_label?: string;
  branch_type?: string;
  is_walk_in_retail_outlet?: boolean;
  country_code: string;
  city: string | null;
  admin1?: string | null;
  address_text?: string | null;
  address?: string | null;
  phone_e164?: string | null;
  phone?: string | null;
  opening_hours?: string | null;
  website_url?: string | null;
  latitude: number | null;
  longitude: number | null;
  eligible_for_nearest?: boolean;
  has_exact_coordinates?: boolean;
  distance_km: number | null;
  distance_label: string;
  product_categories?: string[];
  categories?: string[];
  stock_status: string;
  stock_availability_note?: string | null;
  notes?: string | null;
  verification_method?: string | null;
  source_url: string | null;
}

interface BenchmarkReference {
  benchmark_id: string;
  country_code: string;
  product_name: string;
  amount: string;
  currency: string;
  unit: string;
  record_type: string;
  badge: string;
  period: string;
  observed_at: string;
  sources: Array<{
    source_id: string;
    title?: string;
    url?: string;
  }>;
  notes: string;
}

interface MarketSearchResponse {
  tab: "ingredients" | "ready_mix";
  country_code: string;
  category?: string;
  effective_category?: string;
  available_categories_in_country?: string[];
  price_filter?: "all" | "published_prices_only";
  price_filter_explanation?: string;
  excluded_quote_only_count?: number;
  sort_by:
    | "recommended"
    | "lowest_delivered_total"
    | "nearest"
    | "highest_reviewed";
  location: {
    query: string | null;
    locality_id?: string | null;
    resolved: boolean;
    city: string | null;
    admin1_name?: string | null;
    latitude: number | null;
    longitude: number | null;
    provider: string;
    note: string;
    attribution?: {
      source_name: string;
      license: string;
      url: string;
      text: string;
    };
  };
  sorting_metadata: {
    sort_mode: string;
    sort_control_label?: string;
    price_filter?: string;
    complete_offer_count: number;
    reference_snapshot_count: number;
    directory_lead_count: number;
    excluded_quote_only_count?: number;
    local_branch_count?: number;
    mapped_branch_count?: number;
    configured_weights: {
      cost: number;
      travel: number;
      reviews: number;
      freshness: number;
    };
    active_weights: {
      cost: number;
      travel: number;
      reviews: number;
      freshness: number;
    };
    single_offer_mode: boolean;
    explanation: string;
  };
  progressive_sections?: {
    local_branches: LocalBranchCard[];
    local_branches_count?: number;
    local_branch_count?: number;
    walk_in_retail_branch_count?: number;
    office_or_plant_contact_count?: number;
  };
  map_summary?: {
    verified_store_pin_count?: number;
    verified_coordinate_branch_count?: number;
    verified_store_pins?: LocalBranchCard[];
    unmapped_branch_count?: number;
    unmapped_offer_count?: number;
    policy_note?: string;
    honesty_note?: string;
  };
  pagination?: {
    page: number;
    page_size: number;
    total_results?: number;
    total_offers?: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  offers: MarketOffer[];
  paginated_offers?: MarketOffer[];
  benchmark_references: BenchmarkReference[];
}

interface BasketItemFromMix {
  material_key: string;
  label: string;
  recipe_kg_per_m3: number;
  required_kg: string;
  required_tonnes: string;
  preferred_unit: string;
  bag_rounding_preview: {
    pack_size_kg: number;
    required_kg: string;
    bags_needed: number;
    purchased_kg: string;
    surplus_kg: string;
  } | null;
}

interface BasketFromMixResponse {
  project_volume_m3: string;
  curing_age_days: number;
  total_required_mass_kg: string;
  items: BasketItemFromMix[];
}

const INGREDIENT_CATEGORIES = [
  {
    key: "all",
    label: "All Categories (Cement, Dry Concrete, Aggregates, Mortar & Admixtures)",
  },
  {
    key: "cement",
    label: "Portland & Blended Cement (CEM I / CEM II / M400 / M500 / 42.5)",
  },
  {
    key: "dry_concrete",
    label: "Dry Concrete Mix (Bagged Pre-Blended Concrete)",
  },
  {
    key: "masonry_cement",
    label: "Masonry Cement & Mortar Binder",
  },
  {
    key: "repair_mortar",
    label: "Structural Repair Mortar",
  },
  {
    key: "cement_adhesive",
    label: "Cementitious Tile & Construction Adhesive",
  },
  {
    key: "floor_hardener",
    label: "Dry-Shake Floor Hardener",
  },
  {
    key: "mortar",
    label: "Pre-Mixed Masonry / Render Mortar",
  },
  { key: "fine_aggregate", label: "Fine Aggregate (Concrete Sand)" },
  {
    key: "coarse_aggregate",
    label: "Coarse Aggregate (Crushed Stone / Gravel)",
  },
  {
    key: "aggregates",
    label: "All Aggregates (Sand, Gravel & Crushed Stone)",
  },
  {
    key: "blast_furnace_slag",
    label: "Ground Granulated Blast-Furnace Slag (GGBFS)",
  },
  { key: "fly_ash", label: "Coal Fly Ash (Class F / Class C)" },
  {
    key: "superplasticizer",
    label: "Superplasticizer / High-Range Water Reducer",
  },
];

const QUANTITY_UNITS = [
  { key: "kg", label: "Kilograms (kg)" },
  { key: "tonne", label: "Metric Tonnes (1,000 kg)" },
  { key: "bag", label: "Standard Bags (50 kg / 25 kg)" },
  { key: "lb", label: "Pounds (1 lb = 0.45359237 kg)" },
  { key: "short_ton", label: "US Short Tons (2,000 lb)" },
  { key: "long_ton", label: "UK Long Tons (2,240 lb)" },
];

export function MaterialsMarketWorkspace() {
  const searchParams = useSearchParams();
  const fromMixLabParam = searchParams?.get("fromMixLab") === "1";

  const [overview, setOverview] = useState<MarketOverviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"ingredients" | "ready_mix">(
    "ingredients"
  );
  const [countryCode, setCountryCode] = useState<string>("AM");
  const [productCategory, setProductCategory] = useState<string>("cement");
  const [quantityValue, setQuantityValue] = useState<number>(1000);
  const [quantityUnit, setQuantityUnit] = useState<string>("kg");
  const [useBasketSearchMode, setUseBasketSearchMode] =
    useState<boolean>(false);

  // Ready-mix parameters
  const [volumeValue, setVolumeValue] = useState<number>(6.0);
  const [volumeUnit, setVolumeUnit] = useState<"m3" | "yd3">("m3");
  const [strengthClassFilter, setStrengthClassFilter] = useState<string>("");
  const [needsPump, setNeedsPump] = useState<boolean>(false);

  // Location & Autocomplete state
  const [locationQuery, setLocationQuery] = useState<string>("");
  const [selectedLocality, setSelectedLocality] =
    useState<LocationSuggestion | null>(null);
  const [manualLocationEntry, setManualLocationEntry] =
    useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const comboboxContainerRef = useRef<HTMLDivElement | null>(null);

  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Separate Sorting & Price Filter controls + Pagination
  const [sortBy, setSortBy] = useState<
    "recommended" | "lowest_delivered_total" | "nearest" | "highest_reviewed"
  >("recommended");
  const [priceFilter, setPriceFilter] = useState<
    "all" | "published_prices_only"
  >("all");
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  // Search results state
  const [searchResult, setSearchResult] = useState<MarketSearchResponse | null>(
    null
  );
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Mix Lab transferred basket state
  const [transferredPayload, setTransferredPayload] = useState<{
    mix: Record<string, number>;
    project_volume_m3: number;
    predicted_strength_mpa?: number | null;
  } | null>(null);
  const [basketData, setBasketData] = useState<BasketFromMixResponse | null>(
    null
  );
  const [loadingBasket, setLoadingBasket] = useState<boolean>(false);

  // Modals: Quote Preparation & Supplier Reviews
  const [quoteModalTarget, setQuoteModalTarget] = useState<{
    supplierName: string;
    countryCode: string;
    productName: string;
    quantitySummary: string;
    sourceUrl?: string | null;
    referencePriceNote?: string;
  } | null>(null);
  const [copiedQuote, setCopiedQuote] = useState<boolean>(false);

  const [reviewModalSupplier, setReviewModalSupplier] = useState<{
    supplierId: string;
    supplierName: string;
  } | null>(null);
  const [supplierReviews, setSupplierReviews] = useState<any[]>([]);
  const [reviewForm, setReviewForm] = useState({
    reviewerUserId: "verified_engineer_session",
    reviewerDisplayName: "",
    serviceRating: 5,
    materialRating: 5,
    orderReference: "",
    title: "",
    reviewText: "",
  });
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState<string | null>(
    null
  );

  // 1. Load Market Overview on mount
  useEffect(() => {
    apiGet<MarketOverviewResponse>("/market/overview")
      .then((res) => {
        setOverview(res);
      })
      .catch(() => {});
  }, []);

  // Close suggestion dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        comboboxContainerRef.current &&
        !comboboxContainerRef.current.contains(e.target as Node)
      ) {
        setIsSuggestOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch country-scoped location suggestions with AbortController cancellation
  const fetchLocationSuggestions = useCallback(
    async (cc: string, q: string) => {
      if (suggestAbortRef.current) {
        suggestAbortRef.current.abort();
      }
      const controller = new AbortController();
      suggestAbortRef.current = controller;
      setLoadingSuggestions(true);
      try {
        const res = await apiGet<LocationSuggestResponse>(
          `/locations/suggest?country=${encodeURIComponent(
            cc
          )}&q=${encodeURIComponent(q)}&limit=8`,
          { signal: controller.signal }
        );
        if (!controller.signal.aborted) {
          setSuggestions(res.suggestions || []);
          setHighlightedIndex(
            res.suggestions && res.suggestions.length > 0 ? 0 : -1
          );
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSuggestions(false);
        }
      }
    },
    []
  );

  // Debounced autocomplete fetch when typing or changing country
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLocationSuggestions(countryCode, locationQuery.trim());
    }, 160);
    return () => clearTimeout(timer);
  }, [countryCode, locationQuery, fetchLocationSuggestions]);

  // Handle country change: clear any incompatible locality or stale coordinates
  const handleCountryChange = (newCountry: string) => {
    const normalized = newCountry.toUpperCase();
    setCountryCode(normalized);
    setPage(1);
    if (
      selectedLocality &&
      selectedLocality.country_code.toUpperCase() !== normalized
    ) {
      setSelectedLocality(null);
    }
    setLocationQuery("");
    setSelectedLocality(null);
    setManualLocationEntry(false);
    setUserCoords(null);
    setGpsStatus(null);
    setIsSuggestOpen(false);
  };

  // Select a suggestion from the combobox
  const handleSelectSuggestion = (item: LocationSuggestion) => {
    setSelectedLocality(item);
    setLocationQuery(item.name);
    setManualLocationEntry(false);
    setUserCoords(null);
    setGpsStatus(null);
    setIsSuggestOpen(false);
    setPage(1);
  };

  // 2. Check sessionStorage for Mix Lab transfer
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("astramix_market_basket_transfer");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.mix) {
          const canonicalMix = {
            cement: Number(parsed.mix.cement ?? DEFAULT_MIX.cement),
            blast_furnace_slag: Number(
              parsed.mix.blast_furnace_slag ??
                parsed.mix.blastFurnaceSlag ??
                DEFAULT_MIX.blastFurnaceSlag
            ),
            fly_ash: Number(
              parsed.mix.fly_ash ?? parsed.mix.flyAsh ?? DEFAULT_MIX.flyAsh
            ),
            water: Number(parsed.mix.water ?? DEFAULT_MIX.water),
            superplasticizer: Number(
              parsed.mix.superplasticizer ?? DEFAULT_MIX.superplasticizer
            ),
            coarse_aggregate: Number(
              parsed.mix.coarse_aggregate ??
                parsed.mix.coarseAggregate ??
                DEFAULT_MIX.coarseAggregate
            ),
            fine_aggregate: Number(
              parsed.mix.fine_aggregate ??
                parsed.mix.fineAggregate ??
                DEFAULT_MIX.fineAggregate
            ),
            age: Number(
              parsed.mix.age ?? parsed.mix.ageDays ?? DEFAULT_MIX.ageDays
            ),
          };
          const vol = Number(
            parsed.project_volume_m3 ?? parsed.volumeM3 ?? 5.0
          );
          setTransferredPayload({
            mix: canonicalMix,
            project_volume_m3: vol > 0 ? vol : 5.0,
            predicted_strength_mpa:
              parsed.predicted_strength_mpa ??
              parsed.predictedStrengthMPa ??
              null,
          });
          if (fromMixLabParam) {
            setUseBasketSearchMode(true);
          }
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [fromMixLabParam]);

  // 3. Fetch Mix Lab Basket whenever transferredPayload changes
  const fetchMixBasket = useCallback(
    async (mixObj: Record<string, number>, vol: number) => {
      setLoadingBasket(true);
      try {
        const resp = await apiPost<BasketFromMixResponse>(
          "/market/basket-from-mix",
          {
            mix: mixObj,
            project_volume_m3: vol,
          }
        );
        setBasketData(resp);
      } catch {
        setBasketData(null);
      } finally {
        setLoadingBasket(false);
      }
    },
    []
  );

  useEffect(() => {
    if (transferredPayload) {
      fetchMixBasket(
        transferredPayload.mix,
        transferredPayload.project_volume_m3
      );
    }
  }, [transferredPayload, fetchMixBasket]);

  // 4. Execute Market Search
  const runMarketSearch = useCallback(async () => {
    setLoadingSearch(true);
    setSearchError(null);
    try {
      const payload: Record<string, any> = {
        tab: activeTab,
        country_code: countryCode,
        category: activeTab === "ready_mix" ? "ready_mix" : productCategory,
        quantity: quantityValue,
        unit: activeTab === "ready_mix" ? volumeUnit : quantityUnit,
        basket_items:
          activeTab === "ingredients" &&
          useBasketSearchMode &&
          basketData?.items
            ? basketData.items.map((it) => ({
                material_key: it.material_key,
                required_kg: it.required_kg,
              }))
            : null,
        volume_m3: volumeValue,
        strength_class:
          activeTab === "ready_mix" && strengthClassFilter.trim() !== ""
            ? strengthClassFilter.trim()
            : null,
        needs_pump: activeTab === "ready_mix" ? needsPump : false,
        location_query: locationQuery.trim() || null,
        locality_id:
          selectedLocality && !manualLocationEntry ? selectedLocality.id : null,
        manual_location_entry: manualLocationEntry,
        latitude:
          userCoords && !manualLocationEntry
            ? userCoords.lat
            : selectedLocality && !manualLocationEntry
            ? selectedLocality.latitude
            : null,
        longitude:
          userCoords && !manualLocationEntry
            ? userCoords.lon
            : selectedLocality && !manualLocationEntry
            ? selectedLocality.longitude
            : null,
        sort_by: sortBy,
        price_filter: priceFilter,
        page,
        page_size: pageSize,
      };
      const res = await apiPost<MarketSearchResponse>(
        "/market/search",
        payload
      );
      setSearchResult(res);
    } catch (err: any) {
      setSearchError(err?.message || "Failed to search Materials Market.");
    } finally {
      setLoadingSearch(false);
    }
  }, [
    activeTab,
    countryCode,
    productCategory,
    quantityValue,
    quantityUnit,
    useBasketSearchMode,
    basketData,
    volumeValue,
    volumeUnit,
    strengthClassFilter,
    needsPump,
    locationQuery,
    selectedLocality,
    manualLocationEntry,
    userCoords,
    sortBy,
    priceFilter,
    page,
  ]);

  useEffect(() => {
    runMarketSearch();
  }, [runMarketSearch]);

  // Explicit consented browser geolocation
  const handleRequestBrowserLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsStatus("Geolocation is not supported by your browser.");
      return;
    }
    setGpsStatus("Requesting browser GPS permission...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelectedLocality(null);
        setManualLocationEntry(false);
        setUserCoords({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lon: Number(pos.coords.longitude.toFixed(5)),
        });
        setGpsStatus(
          `GPS active (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`
        );
      },
      (err) => {
        setGpsStatus(
          `GPS permission declined or unavailable (${err.message}). Using manual city/country.`
        );
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  // Open Supplier Review Drawer
  const handleOpenReviews = async (
    supplierId: string,
    supplierName: string
  ) => {
    setReviewModalSupplier({ supplierId, supplierName });
    setReviewSubmitMessage(null);
    try {
      const res = await apiGet<{ reviews: any[] }>(
        `/market/suppliers/${encodeURIComponent(supplierId)}/reviews`
      );
      setSupplierReviews(res.reviews || []);
    } catch {
      setSupplierReviews([]);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalSupplier) return;
    setReviewSubmitMessage(null);
    try {
      const res = await apiPost<{ message?: string; status_note?: string }>(
        `/market/suppliers/${encodeURIComponent(
          reviewModalSupplier.supplierId
        )}/reviews`,
        {
          reviewer_user_id:
            reviewForm.reviewerUserId ||
            `user_${reviewForm.reviewerDisplayName
              .toLowerCase()
              .replace(/\s+/g, "_")}`,
          reviewer_display_name: reviewForm.reviewerDisplayName,
          order_reference: reviewForm.orderReference,
          service_rating: reviewForm.serviceRating,
          material_rating: reviewForm.materialRating,
          title: reviewForm.title || "Verified Order Feedback",
          review_text: reviewForm.reviewText,
          verified_purchase: false,
        }
      );
      setReviewSubmitMessage(
        res.status_note ||
          res.message ||
          "Review submitted for purchase-reference verification and moderation. It will appear publicly once approved."
      );
      setReviewForm({
        reviewerUserId: "verified_engineer_session",
        reviewerDisplayName: "",
        serviceRating: 5,
        materialRating: 5,
        orderReference: "",
        title: "",
        reviewText: "",
      });
    } catch (err: any) {
      setReviewSubmitMessage(
        err?.message || "Could not submit review. Please check all fields."
      );
    }
  };

  const selectedCountryMeta = overview?.countries.find(
    (c) => c.country_code === countryCode
  );

  // Separate priced offers (complete + snapshots) vs directory leads
  const pricedOffers =
    searchResult?.offers.filter(
      (o) => o.quote_completeness !== "directory_lead_no_price"
    ) ?? [];
  const directoryLeads =
    searchResult?.offers.filter(
      (o) => o.quote_completeness === "directory_lead_no_price"
    ) ?? [];
  const localBranches = searchResult?.progressive_sections?.local_branches ?? [];

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#172D44] pb-20 font-sans">
      {/* Top Header */}
      <section className="border-b border-[#D8DFDF] bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#E3F2EF] px-3.5 py-1 text-xs font-bold text-[#176B65] border border-[#176B65]/25 mb-3">
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>
                  Section 2 · Concrete Ingredients, Construction Products &amp;
                  Ready-Mix Market
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#172D44]">
                Materials Market
              </h1>
              <p className="mt-2 text-sm text-[#536574] max-w-2xl leading-relaxed">
                Compare concrete ingredients, dry mixes, aggregates, and
                ready-mixed concrete across{" "}
                <strong className="text-[#172D44]">
                  {overview?.coverage.country_count ?? 100} countries
                </strong>{" "}
                ({overview?.coverage.refreshed_50_country_count ?? 50} countries
                in the verified 2026 refresh pack,{" "}
                {overview?.coverage.countries_with_price_snapshots ?? 48} with
                published price snapshots,{" "}
                {overview?.coverage.global_50_supplier_count ?? 542} verified supplier &amp; dealer networks
                with {overview?.coverage.global_50_branch_count ?? 3451} branch &amp; plant locations outside Cameroon,{" "}
                {overview?.coverage.verified_branch_count ?? 2176} physical walk-in pins, and{" "}
                {(
                  overview?.coverage.geonames_Memory_cities_count ?? 62964
                ).toLocaleString("en-US")}{" "}
                searchable cities).
              </p>
            </div>

            {/* Primary Mode Tabs: Ingredients vs Ready-Mixed Concrete */}
            <div
              role="tablist"
              aria-label="Materials Market Search Mode"
              className="inline-flex rounded-xl bg-[#F0ECE2] p-1.5 border border-[#D8DFDF] self-start"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "ingredients"}
                onClick={() => {
                  setActiveTab("ingredients");
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                  activeTab === "ingredients"
                    ? "bg-[#176B65] text-white shadow-xs"
                    : "text-[#536574] hover:text-[#172D44]"
                }`}
              >
                <Package className="h-4 w-4" />
                <span>Concrete Ingredients &amp; Products</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "ready_mix"}
                onClick={() => {
                  setActiveTab("ready_mix");
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                  activeTab === "ready_mix"
                    ? "bg-[#A65429] text-white shadow-xs"
                    : "text-[#536574] hover:text-[#172D44]"
                }`}
              >
                <Truck className="h-4 w-4" />
                <span>Ready-Mixed Concrete</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* MIX LAB TRANSFERRED BASKET PANEL */}
        {transferredPayload && (
          <div className="rounded-2xl border-2 border-[#176B65]/40 bg-[#E3F2EF]/50 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#176B65]/20">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#176B65]">
                  <Sparkles className="h-4 w-4" />
                  <span>Mix Lab Order Basket</span>
                </div>
                <h2 className="text-lg font-black text-[#172D44] mt-0.5">
                  Ingredient Requirements for{" "}
                  <span className="font-mono text-[#176B65]">
                    {transferredPayload.project_volume_m3} m³
                  </span>{" "}
                  Batch
                  {transferredPayload.predicted_strength_mpa
                    ? ` (${Number(
                        transferredPayload.predicted_strength_mpa
                      ).toFixed(1)} MPa Predicted)`
                    : ""}
                </h2>
                <p className="text-xs text-[#536574] mt-0.5">
                  Each active ingredient is scaled by{" "}
                  <code>recipe_kg_per_m3 × project_volume_m3</code> with
                  whole-bag rounding (`required_kg`, `purchased_kg`,
                  `surplus_kg`).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-semibold text-[#172D44] flex items-center gap-2">
                  <span>Batch Volume (m³):</span>
                  <input
                    type="number"
                    min={0.5}
                    max={10000}
                    step={0.5}
                    value={transferredPayload.project_volume_m3}
                    onChange={(e) => {
                      const v = Math.max(0.5, Number(e.target.value) || 1);
                      setTransferredPayload({
                        ...transferredPayload,
                        project_volume_m3: v,
                      });
                    }}
                    className="w-24 rounded-lg border border-[#D8DFDF] bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-[#172D44]"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("ingredients");
                    setUseBasketSearchMode(!useBasketSearchMode);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    useBasketSearchMode
                      ? "bg-[#176B65] text-white"
                      : "bg-white border border-[#176B65] text-[#176B65]"
                  }`}
                >
                  {useBasketSearchMode
                    ? "✓ Filtering by Full Mix Basket"
                    : "Match Entire Basket"}
                </button>

                <Link
                  href="/mix-lab/predict"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8DFDF] bg-white px-3 py-1.5 text-xs font-semibold text-[#172D44] hover:bg-[#F7F5EF]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Edit in Mix Lab</span>
                </Link>
              </div>
            </div>

            {loadingBasket ? (
              <p className="py-4 text-xs text-[#536574]">
                Calculating ingredient quantities and whole-bag rounding...
              </p>
            ) : basketData ? (
              <div className="mt-4 space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#176B65]/20 text-[#536574]">
                        <th className="py-2 pr-3 font-semibold">Ingredient</th>
                        <th className="py-2 px-3 font-semibold font-mono">
                          Recipe (kg/m³)
                        </th>
                        <th className="py-2 px-3 font-semibold font-mono">
                          Required Mass (kg / tonnes)
                        </th>
                        <th className="py-2 px-3 font-semibold font-mono">
                          Whole-Bag Rounding (Purchased / Surplus)
                        </th>
                        <th className="py-2 pl-3 font-semibold text-right">
                          Single-Ingredient Filter
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#176B65]/15">
                      {basketData.items.map((item) => (
                        <tr key={item.material_key}>
                          <td className="py-2.5 pr-3 font-bold text-[#172D44]">
                            {item.label}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#536574]">
                            {item.recipe_kg_per_m3.toFixed(1)} kg/m³
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#176B65]">
                            {Number(item.required_kg).toLocaleString("en-US")}{" "}
                            kg{" "}
                            <span className="text-[#536574] font-normal">
                              ({item.required_tonnes} t)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#536574]">
                            {item.bag_rounding_preview ? (
                              <>
                                {item.bag_rounding_preview.bags_needed} bags (
                                {item.bag_rounding_preview.pack_size_kg} kg) →{" "}
                                <strong className="text-[#172D44]">
                                  {Number(
                                    item.bag_rounding_preview.purchased_kg
                                  ).toLocaleString("en-US")}{" "}
                                  kg
                                </strong>{" "}
                                <span className="text-[#A26012]">
                                  (+{item.bag_rounding_preview.surplus_kg} kg
                                  surplus)
                                </span>
                              </>
                            ) : (
                              <span>Bulk delivery (no bag rounding)</span>
                            )}
                          </td>
                          <td className="py-2.5 pl-3 text-right">
                            {item.material_key !== "water" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab("ingredients");
                                  setUseBasketSearchMode(false);
                                  setProductCategory(item.material_key);
                                  setQuantityValue(Number(item.required_kg));
                                  setQuantityUnit("kg");
                                  setPage(1);
                                }}
                                className="text-xs font-bold text-[#176B65] hover:underline"
                              >
                                Compare {item.label} →
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-[#536574] flex items-center justify-between pt-1">
                  <span>
                    Total Batch Mass:{" "}
                    <strong className="font-mono text-[#172D44]">
                      {Number(
                        basketData.total_required_mass_kg
                      ).toLocaleString("en-US")}{" "}
                      kg
                    </strong>{" "}
                    for {basketData.project_volume_m3} m³ (curing age:{" "}
                    {basketData.curing_age_days} days)
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* FILTER & ORDER CONFIGURATION BAR */}
        <div className="rounded-2xl border border-[#D8DFDF] bg-white p-6 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Country Selector */}
            <div>
              <label
                htmlFor="market-country-select"
                className="block text-xs font-bold uppercase tracking-wider text-[#536574] mb-1.5"
              >
                1. Country ({overview?.coverage.country_count ?? 100} Indexed)
              </label>
              <select
                id="market-country-select"
                value={countryCode}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full rounded-xl border border-[#D8DFDF] bg-[#F7F5EF] px-3 py-2.5 text-xs font-semibold text-[#172D44] focus:border-[#176B65] focus:outline-none"
              >
                {overview?.countries.map((c) => (
                  <option key={c.country_code} value={c.country_code}>
                    {c.country_name} ({c.country_code}) —{" "}
                    {c.price_snapshot_count > 0
                      ? `${c.price_snapshot_count} published price(s) (${c.display_currency})`
                      : `${c.supplier_count ?? 1} verified supplier(s) (${
                          c.display_currency
                        }, quote required)`}
                  </option>
                )) ?? (
                  <>
                    <option value="AM">Armenia (AM)</option>
                    <option value="US">United States (US)</option>
                    <option value="CA">Canada (CA)</option>
                    <option value="CM">Cameroon (CM)</option>
                    <option value="NG">Nigeria (NG)</option>
                    <option value="KE">Kenya (KE)</option>
                    <option value="GE">Georgia (GE)</option>
                  </>
                )}
              </select>
              {selectedCountryMeta && (
                <p className="mt-1.5 text-[11px] text-[#536574]">
                  Currency:{" "}
                  <strong className="text-[#172D44]">
                    {selectedCountryMeta.display_currency}
                  </strong>{" "}
                  · {selectedCountryMeta.price_snapshot_count} price snapshots ·{" "}
                  {selectedCountryMeta.supplier_count ?? 1} suppliers
                </p>
              )}
            </div>

            {/* 2. Product / Ready-mix specification */}
            {activeTab === "ingredients" ? (
              <div>
                <label
                  htmlFor="market-ingredient-select"
                  className="block text-xs font-bold uppercase tracking-wider text-[#536574] mb-1.5"
                >
                  2. Product Category
                </label>
                <select
                  id="market-ingredient-select"
                  value={productCategory}
                  disabled={useBasketSearchMode}
                  onChange={(e) => {
                    setUseBasketSearchMode(false);
                    setProductCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-[#D8DFDF] bg-[#F7F5EF] px-3 py-2.5 text-xs font-semibold text-[#172D44] disabled:opacity-60 focus:border-[#176B65] focus:outline-none"
                >
                  {INGREDIENT_CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {useBasketSearchMode ? (
                  <p className="mt-1 text-[11px] text-[#176B65] font-semibold">
                    Matching all active Mix Lab basket ingredients.{" "}
                    <button
                      type="button"
                      onClick={() => setUseBasketSearchMode(false)}
                      className="underline"
                    >
                      Switch to single category
                    </button>
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-[#536574]">
                    Strict category matching: cement searches never return
                    ready-mix or repair mortar.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="market-strength-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#536574] mb-1.5"
                >
                  2. Ready-Mix Grade Filter &amp; Pump
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="market-strength-input"
                    type="text"
                    placeholder="Optional (e.g. C25/30, M300, B25)"
                    value={strengthClassFilter}
                    onChange={(e) => {
                      setStrengthClassFilter(e.target.value);
                      setPage(1);
                    }}
                    className="flex-1 rounded-xl border border-[#D8DFDF] bg-[#F7F5EF] px-3 py-2 text-xs text-[#172D44]"
                  />
                </div>
                <label className="mt-2 flex items-center gap-1.5 text-xs text-[#172D44] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needsPump}
                    onChange={(e) => {
                      setNeedsPump(e.target.checked);
                      setPage(1);
                    }}
                    className="rounded border-[#D8DFDF] text-[#176B65]"
                  />
                  <span>Include Concrete Pump Service</span>
                </label>
              </div>
            )}

            {/* 3. Order Quantity & Unit */}
            {activeTab === "ingredients" ? (
              <div>
                <label
                  htmlFor="market-qty-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#536574] mb-1.5"
                >
                  3. Order Quantity &amp; Unit
                </label>
                <div className="flex gap-2">
                  <input
                    id="market-qty-input"
                    type="number"
                    min={1}
                    max={1000000}
                    step={10}
                    disabled={useBasketSearchMode}
                    value={quantityValue}
                    onChange={(e) => {
                      setQuantityValue(Math.max(1, Number(e.target.value) || 1));
                      setPage(1);
                    }}
                    className="w-28 rounded-xl border border-[#D8DFDF] bg-[#F7F5EF] px-3 py-2 text-xs font-mono font-bold text-[#172D44] disabled:opacity-60"
                  />
                  <select
                    aria-label="Quantity unit"
                    value={quantityUnit}
                    disabled={useBasketSearchMode}
                    onChange={(e) => {
                      setQuantityUnit(e.target.value);
                      setPage(1);
                    }}
                    className="flex-1 rounded-xl border border-[#D8DFDF] bg-[#F7F5EF] px-2.5 py-2 text-xs font-semibold text-[#172D44] disabled:opacity-60"
                  >
                    {QUANTITY_UNITS.map((u) => (
                      <option key={u.key} value={u.key}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-[11px] text-[#536574]">
                  Bagged offers round up to whole bags and apply bulk quantity
                  tier discounts where published.
                </p>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="market-vol-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#536574] mb-1.5"
                >
                  3. Concrete Volume (m³ / yd³)
                </label>
                <div className="flex gap-2">
                  <input
                    id="market-vol-input"
                    type="number"
                    min={0.5}
                    max={5000}
                    step={0.5}
                    value={volumeValue}
                    onChange={(e) => {
                      setVolumeValue(
                        Math.max(0.5, Number(e.target.value) || 1)
                      );
                      setPage(1);
                    }}
                    className="w-28 rounded-xl border border-[#D8DFDF] bg-[#F7F5EF] px-3 py-2 text-xs font-mono font-bold text-[#172D44]"
                  />
                  <select
                    aria-label="Volume unit"
                    value={volumeUnit}
                    onChange={(e) => {
                      setVolumeUnit(e.target.value as "m3" | "yd3");
                      setPage(1);
                    }}
                    className="flex-1 rounded-xl border border-[#D8DFDF] bg-[#F7F5EF] px-2.5 py-2 text-xs font-semibold text-[#172D44]"
                  >
                    <option value="m3">Cubic Meters (m³)</option>
                    <option value="yd3">
                      Cubic Yards (1 yd³ = 0.764555 m³)
                    </option>
                  </select>
                </div>
                <p className="mt-1 text-[11px] text-[#536574] font-mono">
                  {volumeUnit === "yd3"
                    ? `= ${(volumeValue * 0.764554857984).toFixed(2)} m³`
                    : `= ${(volumeValue / 0.764554857984).toFixed(2)} yd³`}
                </p>
              </div>
            )}

            {/* 4. Project Location with Country-Scoped GeoNames Combobox */}
            <div ref={comboboxContainerRef} className="relative">
              <label
                htmlFor="market-city-input"
                className="block text-xs font-bold uppercase tracking-wider text-[#536574] mb-1.5"
              >
                4. City / Locality ({countryCode})
              </label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input
                    id="market-city-input"
                    type="text"
                    role="combobox"
                    aria-expanded={isSuggestOpen}
                    aria-autocomplete="list"
                    aria-controls="location-suggestions-listbox"
                    aria-activedescendant={
                      isSuggestOpen && highlightedIndex >= 0
                        ? `loc-opt-${highlightedIndex}`
                        : undefined
                    }
                    placeholder="Type city or select from list..."
                    value={locationQuery}
                    onFocus={() => setIsSuggestOpen(true)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocationQuery(val);
                      setSelectedLocality(null);
                      setManualLocationEntry(val.trim().length > 0);
                      setIsSuggestOpen(true);
                      setPage(1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setIsSuggestOpen(true);
                        setHighlightedIndex((prev) =>
                          suggestions.length === 0
                            ? -1
                            : (prev + 1) % suggestions.length
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setIsSuggestOpen(true);
                        setHighlightedIndex((prev) =>
                          suggestions.length === 0
                            ? -1
                            : (prev - 1 + suggestions.length) %
                              suggestions.length
                        );
                      } else if (e.key === "Enter") {
                        if (
                          isSuggestOpen &&
                          highlightedIndex >= 0 &&
                          suggestions[highlightedIndex]
                        ) {
                          e.preventDefault();
                          handleSelectSuggestion(suggestions[highlightedIndex]);
                        } else {
                          setIsSuggestOpen(false);
                        }
                      } else if (e.key === "Escape") {
                        setIsSuggestOpen(false);
                      }
                    }}
                    className="w-full rounded-xl border border-[#D8DFDF] bg-[#F7F5EF] pl-3 pr-7 py-2 text-xs text-[#172D44] focus:border-[#176B65] focus:outline-none"
                  />
                  {locationQuery && (
                    <button
                      type="button"
                      aria-label="Clear location"
                      onClick={() => {
                        setLocationQuery("");
                        setSelectedLocality(null);
                        setManualLocationEntry(false);
                        setIsSuggestOpen(false);
                        setPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#536574] hover:text-[#172D44]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRequestBrowserLocation}
                  title="Use consented browser GPS location"
                  className="inline-flex items-center gap-1 rounded-xl border border-[#D8DFDF] bg-[#F0ECE2] hover:bg-[#E5DFD2] px-2.5 py-2 text-xs font-semibold text-[#172D44]"
                >
                  <Navigation className="h-3.5 w-3.5 text-[#176B65]" />
                  <span>GPS</span>
                </button>
              </div>

              {/* Autocomplete Dropdown Listbox */}
              {isSuggestOpen && (
                <div
                  id="location-suggestions-listbox"
                  role="listbox"
                  aria-label="City suggestions"
                  className="absolute z-40 mt-1 w-full rounded-xl border border-[#D8DFDF] bg-white shadow-lg max-h-64 overflow-y-auto divide-y divide-[#F0ECE2]"
                >
                  {loadingSuggestions ? (
                    <div className="p-3 text-xs text-[#536574]">
                      Searching cities in {countryCode}...
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="p-3 text-xs text-[#536574]">
                      No matching GeoNames city in {countryCode}. Manual text
                      entry will be used without fabricated coordinates.
                    </div>
                  ) : (
                    suggestions.map((sug, idx) => (
                      <div
                        key={sug.id}
                        id={`loc-opt-${idx}`}
                        role="option"
                        aria-selected={idx === highlightedIndex}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSuggestion(sug);
                        }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`cursor-pointer px-3 py-2 text-xs transition-colors ${
                          idx === highlightedIndex
                            ? "bg-[#E3F2EF] text-[#172D44]"
                            : "bg-white text-[#172D44] hover:bg-[#F7F5EF]"
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{sug.display_label}</span>
                          <span className="font-mono text-[10px] text-[#536574]">
                            {sug.latitude.toFixed(2)}, {sug.longitude.toFixed(2)}
                          </span>
                        </div>
                        {sug.population ? (
                          <div className="text-[10px] text-[#536574]">
                            Pop: {sug.population.toLocaleString("en-US")} · ID:{" "}
                            {sug.id}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                  <div className="bg-[#F7F5EF] px-3 py-1.5 text-[10px] text-[#536574] flex items-center justify-between">
                    <span>City/locality data from GeoNames (CC BY 4.0)</span>
                    <a
                      href="https://www.geonames.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-[#176B65]"
                    >
                      geonames.org
                    </a>
                  </div>
                </div>
              )}

              {selectedLocality ? (
                <p className="mt-1 text-[11px] text-[#1E6F50] font-semibold">
                  ✓ Selected: {selectedLocality.display_label} (
                  {selectedLocality.latitude.toFixed(3)},{" "}
                  {selectedLocality.longitude.toFixed(3)})
                </p>
              ) : searchResult?.location ? (
                <p className="mt-1 text-[11px] text-[#536574]">
                  {searchResult.location.note}
                </p>
              ) : null}
              {gpsStatus && (
                <p className="mt-1 text-[10px] text-[#176B65]">{gpsStatus}</p>
              )}
              <p className="mt-0.5 text-[10px] text-[#536574]">
                Locality index:{" "}
                <a
                  href="https://www.geonames.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#176B65]"
                >
                  GeoNames (CC BY 4.0)
                </a>
              </p>
            </div>
          </div>

          {/* SEPARATE SORTING & PRICE FILTER CONTROLS */}
          <div className="mt-6 pt-5 border-t border-[#D8DFDF] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            {/* Sort By Control */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#536574] mr-1 flex items-center gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#176B65]" />
                <span>Sort By:</span>
              </span>
              {[
                {
                  key: "recommended",
                  label: "Recommended for your filters",
                },
                {
                  key: "lowest_delivered_total",
                  label: "Lowest published item price",
                },
                {
                  key: "nearest",
                  label: "Nearest mapped store",
                },
                {
                  key: "highest_reviewed",
                  label: "Highest reviewed",
                },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setSortBy(s.key as any);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    sortBy === s.key
                      ? "bg-[#176B65] text-white shadow-xs"
                      : "bg-[#F0ECE2] text-[#172D44] hover:bg-[#E5DFD2]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Separate Price Filter Control */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#536574] mr-1">
                Price Filter:
              </span>
              <div
                role="group"
                aria-label="Price Filter Mode"
                className="inline-flex rounded-lg bg-[#F0ECE2] p-1 border border-[#D8DFDF]"
              >
                <button
                  type="button"
                  onClick={() => {
                    setPriceFilter("all");
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                    priceFilter === "all"
                      ? "bg-white text-[#172D44] shadow-xs"
                      : "text-[#536574] hover:text-[#172D44]"
                  }`}
                >
                  All Verified Suppliers &amp; Channels
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPriceFilter("published_prices_only");
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                    priceFilter === "published_prices_only"
                      ? "bg-[#A65429] text-white shadow-xs"
                      : "text-[#536574] hover:text-[#172D44]"
                  }`}
                >
                  Published Prices Only
                </button>
              </div>
            </div>
          </div>

          {/* Active Cohort Weights & Price Filter Explanation */}
          {searchResult?.sorting_metadata && (
            <div className="mt-4 pt-3 border-t border-[#F0ECE2] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-[#536574]">
              <div>
                {searchResult.price_filter_explanation && (
                  <span>{searchResult.price_filter_explanation}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 bg-[#F7F5EF] px-3 py-1 rounded-lg border border-[#D8DFDF] shrink-0">
                <span className="font-bold text-[#172D44]">
                  Active Cohort Weights:
                </span>
                <span className="font-mono">
                  Cost{" "}
                  {(
                    searchResult.sorting_metadata.active_weights.cost * 100
                  ).toFixed(0)}
                  %
                </span>
                <span>·</span>
                <span className="font-mono">
                  Travel{" "}
                  {(
                    searchResult.sorting_metadata.active_weights.travel * 100
                  ).toFixed(0)}
                  %
                </span>
                <span>·</span>
                <span className="font-mono">
                  Reviews{" "}
                  {(
                    searchResult.sorting_metadata.active_weights.reviews * 100
                  ).toFixed(0)}
                  %
                </span>
                <span>·</span>
                <span className="font-mono">
                  Freshness{" "}
                  {(
                    searchResult.sorting_metadata.active_weights.freshness * 100
                  ).toFixed(0)}
                  %
                </span>
              </div>
            </div>
          )}
        </div>

        {/* HONESTY & DATA PROVENANCE BANNER */}
        {searchResult?.sorting_metadata && (
          <div className="rounded-xl border border-[#205E8A]/25 bg-[#E6F0F7] px-4 py-3 text-xs text-[#172D44] flex items-start gap-3">
            <Info className="h-4 w-4 text-[#205E8A] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>{searchResult.sorting_metadata.explanation}</p>
              <p className="text-[11px] text-[#536574]">
                <strong>Complete confirmed quotes:</strong>{" "}
                {searchResult.sorting_metadata.complete_offer_count} ·{" "}
                <strong>Published reference price snapshots:</strong>{" "}
                {searchResult.sorting_metadata.reference_snapshot_count} ·{" "}
                <strong>Verified directory leads requiring quote:</strong>{" "}
                {searchResult.sorting_metadata.directory_lead_count}
                {searchResult.sorting_metadata.excluded_quote_only_count
                  ? ` (${searchResult.sorting_metadata.excluded_quote_only_count} quote-only supplier(s) hidden by Published Prices Only filter)`
                  : ""}
              </p>
            </div>
          </div>
        )}

        {searchError && (
          <div className="rounded-xl border border-[#B43C2F]/40 bg-[#FBECE9] p-4 text-xs text-[#B43C2F] font-semibold">
            {searchError}
          </div>
        )}

        {/* OFFICIAL GOVERNMENT / REGIONAL COST BENCHMARKS */}
        {searchResult && searchResult.benchmark_references.length > 0 && (
          <div className="rounded-2xl border-2 border-[#205E8A]/35 bg-[#E6F0F7]/60 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-[#205E8A]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-[#172D44]">
                  Official Regional Cost Schedule Reference (Not a Commercial
                  Supplier Offer)
                </h2>
              </div>
              <span className="rounded-md bg-[#205E8A] px-2.5 py-0.5 text-[11px] font-bold text-white">
                Non-Selectable Benchmark
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {searchResult.benchmark_references.map((bm) => (
                <div
                  key={bm.benchmark_id}
                  className="rounded-xl border border-[#D8DFDF] bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#205E8A]">
                      {bm.badge} · ID: <code>{bm.benchmark_id}</code>
                    </div>
                    <h3 className="text-sm font-bold text-[#172D44]">
                      {bm.product_name} ({bm.period})
                    </h3>
                    <p className="text-xs text-[#536574]">{bm.notes}</p>
                    {bm.sources?.[0]?.url && (
                      <a
                        href={bm.sources[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B65] hover:underline"
                      >
                        <span>
                          Source: {bm.sources[0].title || bm.sources[0].url}
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-black font-mono text-[#172D44]">
                      {Number(bm.amount).toLocaleString("en-US")} {bm.currency}{" "}
                      / {bm.unit}
                    </div>
                    <div className="text-[11px] text-[#536574]">
                      Observed: {bm.observed_at}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MATCHED OFFERS & PUBLISHED PRICE SNAPSHOTS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#172D44]">
              {activeTab === "ready_mix"
                ? "Ready-Mixed Concrete Offers & Published Price Snapshots"
                : useBasketSearchMode
                ? "Multi-Ingredient Mix Basket Offers & Published Snapshots"
                : `Published Price Snapshots & Evaluated Offers (${
                    INGREDIENT_CATEGORIES.find((c) => c.key === productCategory)
                      ?.label || productCategory
                  })`}
            </h2>
            {loadingSearch && (
              <span className="text-xs font-semibold text-[#176B65] animate-pulse">
                Updating calculations...
              </span>
            )}
          </div>

          {pricedOffers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8DFDF] bg-white p-8 text-center space-y-2">
              <ShieldAlert className="h-8 w-8 text-[#A26012] mx-auto" />
              <h3 className="text-sm font-bold text-[#172D44]">
                No Published Price Quotes or Snapshots for This Selection in{" "}
                {selectedCountryMeta?.country_name || countryCode}
              </h3>
              <p className="text-xs text-[#536574] max-w-xl mx-auto">
                AstraMix AI never fabricates prices or national averages when
                verified data is absent.{" "}
                {priceFilter === "published_prices_only" ? (
                  <>
                    Switch Price Filter to{" "}
                    <button
                      type="button"
                      onClick={() => setPriceFilter("all")}
                      className="font-bold text-[#176B65] underline"
                    >
                      All Verified Suppliers &amp; Channels
                    </button>{" "}
                    to view verified local branches and quote-based producers in{" "}
                    {selectedCountryMeta?.country_name || countryCode}.
                  </>
                ) : (
                  <>
                    Use the{" "}
                    <strong>
                      Progressive Discovery &amp; Verified Supplier Directory
                    </strong>{" "}
                    below to prepare a direct quote request for local producers
                    in {selectedCountryMeta?.country_name || countryCode}.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pricedOffers.map((offer, idx) => {
                const firstLine = offer.line_items?.[0];
                const disp = offer.dispatch_breakdown;
                return (
                  <div
                    key={offer.price_id || `${offer.supplier_id}-${idx}`}
                    className={`rounded-2xl border bg-white p-5 shadow-xs transition-all ${
                      offer.recommendation_badge === "Recommended" ||
                      offer.recommendation_badge === "Only matched offer"
                        ? "border-[#176B65] ring-1 ring-[#176B65]/30"
                        : "border-[#D8DFDF]"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      {/* Left Column: Supplier, Product & Provenance */}
                      <div className="space-y-2.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {offer.recommendation_badge && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[11px] font-bold ${
                                offer.recommendation_badge === "Recommended" ||
                                offer.recommendation_badge ===
                                  "Only matched offer"
                                  ? "bg-[#176B65] text-white"
                                  : "bg-[#FBF3E4] text-[#A26012] border border-[#A26012]/25"
                              }`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{offer.recommendation_badge}</span>
                            </span>
                          )}
                          {(offer.availability?.label ||
                            offer.availability_badge) && (
                            <span
                              title={
                                offer.availability?.scope_note ||
                                offer.availability_scope_note ||
                                undefined
                              }
                              className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-bold ${
                                (offer.availability?.status ||
                                  offer.availability_status) ===
                                "branch_stock_confirmed"
                                  ? "bg-[#E6F4ED] text-[#1E6F50]"
                                  : "bg-[#E6F0F7] text-[#205E8A]"
                              }`}
                            >
                              {offer.availability?.label ||
                                offer.availability_badge}
                            </span>
                          )}
                          <span className="inline-flex items-center rounded-md bg-[#F0ECE2] px-2.5 py-0.5 text-[11px] font-semibold text-[#536574]">
                            {offer.freshness.label}
                          </span>
                          {offer.price_id && (
                            <span className="text-[11px] font-mono text-[#536574]">
                              ID: {offer.price_id}
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-base font-black text-[#172D44]">
                            {offer.product_name || offer.display_name}
                          </h3>
                          <p className="text-xs font-semibold text-[#536574] mt-0.5">
                            Supplier:{" "}
                            <strong className="text-[#172D44]">
                              {offer.display_name}
                            </strong>{" "}
                            (
                            {(
                              offer.discovery_tier_label ||
                              offer.record_type ||
                              ""
                            ).replace(/_/g, " ")}
                            )
                          </p>
                        </div>

                        {(offer.availability?.scope_note ||
                          offer.availability_scope_note) && (
                          <p className="text-[11px] text-[#536574]">
                            <strong>Scope:</strong>{" "}
                            {offer.availability?.scope_note ||
                              offer.availability_scope_note}
                          </p>
                        )}

                        {offer.recommendation_explanation && (
                          <p className="text-xs text-[#536574]">
                            {offer.recommendation_explanation}
                          </p>
                        )}

                        {/* Distance & Customer Reviews Row */}
                        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                          <div className="inline-flex items-center gap-1.5 text-[#536574]">
                            <MapPin className="h-3.5 w-3.5 text-[#176B65] shrink-0" />
                            <span>{offer.distance_label}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleOpenReviews(
                                offer.supplier_id,
                                offer.display_name
                              )
                            }
                            className="inline-flex items-center gap-1.5 text-[#172D44] hover:text-[#176B65] font-semibold underline"
                          >
                            <Star className="h-3.5 w-3.5 text-[#A26012]" />
                            <span>{offer.review_summary.label}</span>
                          </button>
                        </div>

                        {/* Ingredient Line Items / Bag Rounding Breakdown */}
                        {offer.line_items && offer.line_items.length > 0 && (
                          <div className="rounded-xl bg-[#F7F5EF] border border-[#D8DFDF] p-3.5 text-xs space-y-2">
                            {offer.line_items.map((li) => {
                              const pMin = li.amount_min ?? li.price_min;
                              const pMax = li.amount_max ?? li.price_max;
                              return (
                                <div key={li.price_id} className="space-y-2">
                                  <div className="font-bold text-[#172D44] flex flex-wrap items-center justify-between gap-2">
                                    <span>{li.product_name}</span>
                                    <span className="font-mono text-[#176B65]">
                                      {(li.is_price_range ||
                                        offer.is_price_range) &&
                                      pMin &&
                                      pMax
                                        ? `Published Range: ${Number(
                                            pMin
                                          ).toLocaleString("en-US")} – ${Number(
                                            pMax
                                          ).toLocaleString("en-US")} ${
                                            li.currency
                                          } / ${li.original_unit || "unit"}`
                                        : li.original_amount !== null
                                        ? `Quoted: ${Number(
                                            li.original_amount
                                          ).toLocaleString("en-US")} ${
                                            li.currency
                                          } / ${
                                            li.original_unit ||
                                            "unit unconfirmed"
                                          }`
                                        : `Price: Quote required (${li.currency})`}
                                    </span>
                                  </div>

                                  {li.bags_needed !== null ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                                      <div className="p-2 rounded bg-white border border-[#D8DFDF]">
                                        <span className="block text-[#536574] font-sans">
                                          Required Mass
                                        </span>
                                        <strong className="text-[#172D44]">
                                          {Number(
                                            li.required_kg
                                          ).toLocaleString("en-US")}{" "}
                                          kg
                                        </strong>
                                      </div>
                                      <div className="p-2 rounded bg-white border border-[#D8DFDF]">
                                        <span className="block text-[#536574] font-sans">
                                          Whole Bags Needed
                                        </span>
                                        <strong className="text-[#172D44]">
                                          {li.bags_needed} bags
                                        </strong>
                                      </div>
                                      <div className="p-2 rounded bg-white border border-[#D8DFDF]">
                                        <span className="block text-[#536574] font-sans">
                                          Purchased Mass
                                        </span>
                                        <strong className="text-[#172D44]">
                                          {Number(
                                            li.purchased_kg
                                          ).toLocaleString("en-US")}{" "}
                                          kg
                                        </strong>
                                      </div>
                                      <div className="p-2 rounded bg-white border border-[#D8DFDF]">
                                        <span className="block text-[#536574] font-sans">
                                          Surplus Mass
                                        </span>
                                        <strong className="text-[#A26012]">
                                          +{li.surplus_kg} kg
                                        </strong>
                                      </div>
                                    </div>
                                  ) : li.purchased_kg !== null && li.material_subtotal !== null && !li.is_ambiguous_unit ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                                      <div className="p-2 rounded bg-white border border-[#D8DFDF]">
                                        <span className="block text-[#536574] font-sans">
                                          Required Mass
                                        </span>
                                        <strong className="text-[#172D44]">
                                          {Number(li.required_kg).toLocaleString("en-US")} kg
                                        </strong>
                                      </div>
                                      <div className="p-2 rounded bg-white border border-[#D8DFDF]">
                                        <span className="block text-[#536574] font-sans">
                                          Purchased Mass
                                        </span>
                                        <strong className="text-[#172D44]">
                                          {Number(li.purchased_kg).toLocaleString("en-US")} kg
                                        </strong>
                                      </div>
                                      <div className="p-2 rounded bg-white border border-[#D8DFDF]">
                                        <span className="block text-[#536574] font-sans">
                                          Unit Price
                                        </span>
                                        <strong className="text-[#172D44]">
                                          {Number(li.original_amount).toLocaleString("en-US")} {li.currency} / {li.original_unit}
                                        </strong>
                                      </div>
                                      <div className="p-2 rounded bg-white border border-[#D8DFDF]">
                                        <span className="block text-[#536574] font-sans">
                                          Material Subtotal
                                        </span>
                                        <strong className="text-[#176B65]">
                                          {Number(li.material_subtotal).toLocaleString("en-US")} {li.currency}
                                        </strong>
                                      </div>
                                    </div>
                                  ) : null}

                                  {(li.is_ambiguous_unit || li.pricing_warning) && (
                                    <div className="rounded-lg bg-[#FBF3E4] border border-[#A26012]/30 p-2.5 text-[11px] text-[#A26012] flex items-center gap-1.5 mt-2">
                                      <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#A26012]" />
                                      <span>{li.pricing_warning || "Pricing unit is unconfirmed on the catalog. Contact merchant for bulk pricing quote."}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {offer.notes && offer.notes.length > 0 && (
                              <ul className="list-disc pl-4 text-[11px] text-[#536574] space-y-0.5 pt-1">
                                {offer.notes.filter(Boolean).map((n, idx2) => (
                                  <li key={idx2}>{n}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {/* Ready-Mix Dispatch Breakdown */}
                        {disp && (
                          <div className="rounded-xl bg-[#F7F5EF] border border-[#D8DFDF] p-3.5 text-xs space-y-2">
                            <div className="font-bold text-[#172D44] flex items-center justify-between">
                              <span>Ready-Mix Dispatch &amp; Truckload Math</span>
                              <span className="font-mono text-[#176B65]">
                                Quoted: {offer.original_amount} {offer.currency}{" "}
                                / {offer.original_unit}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                              <div className="p-2 rounded bg-white border border-[#D8DFDF]">
                                <span className="block text-[#536574] font-sans">
                                  Ordered Volume
                                </span>
                                <strong>{disp.ordered_volume_m3} m³</strong>
                              </div>
                              <div className="p-2 rounded bg-white border border-[#D8DFDF]">
                                <span className="block text-[#536574] font-sans">
                                  Trucks ({disp.truck_capacity_m3} m³ cap)
                                </span>
                                <strong>{disp.truck_count} truck(s)</strong>
                              </div>
                              <div className="p-2 rounded bg-white border border-[#D8DFDF]">
                                <span className="block text-[#536574] font-sans">
                                  Material Subtotal
                                </span>
                                <strong>
                                  {Number(
                                    disp.base_material_subtotal
                                  ).toLocaleString("en-US")}{" "}
                                  {offer.currency}
                                </strong>
                              </div>
                              <div className="p-2 rounded bg-white border border-[#D8DFDF]">
                                <span className="block text-[#536574] font-sans">
                                  Pump / Small-Load
                                </span>
                                <strong>
                                  {(
                                    Number(disp.small_load_fee) +
                                    Number(disp.pump_fee)
                                  ).toLocaleString("en-US")}{" "}
                                  {offer.currency}
                                </strong>
                              </div>
                            </div>

                            {offer.notes && offer.notes.length > 0 && (
                              <ul className="list-disc pl-4 text-[11px] text-[#536574] space-y-0.5 pt-1">
                                {offer.notes.filter(Boolean).map((n, idx2) => (
                                  <li key={idx2}>{n}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {/* Unconfirmed unit snapshot notes */}
                        {!firstLine && !disp && offer.notes.length > 0 && (
                          <div className="rounded-xl bg-[#FBF3E4] border border-[#A26012]/30 p-3 text-xs text-[#A26012]">
                            {offer.notes.filter(Boolean).join(" ")}
                          </div>
                        )}

                        {/* Source citation link */}
                        {offer.source_url && (
                          <div className="text-[11px] text-[#536574] flex items-center gap-2">
                            <a
                              href={offer.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#176B65] hover:underline font-semibold"
                            >
                              <span>
                                Evidence Source:{" "}
                                {offer.sources?.[0]?.title || offer.source_url}
                              </span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Total Order Price & Actions */}
                      <div className="lg:w-64 shrink-0 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-[#D8DFDF] pt-4 lg:pt-0 lg:pl-6 space-y-4">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#536574] block">
                            {offer.is_complete_total
                              ? "Delivered Order Total"
                              : offer.is_price_range
                              ? "Published Price Range"
                              : "Reference Snapshot Subtotal"}
                          </span>
                          <div className="text-2xl font-black font-mono text-[#172D44] mt-0.5">
                            {offer.delivered_total !== null
                              ? `${Number(
                                  offer.delivered_total
                                ).toLocaleString("en-US")} ${offer.currency}`
                              : offer.reference_subtotal !== null
                              ? `${Number(
                                  offer.reference_subtotal
                                ).toLocaleString("en-US")} ${offer.currency}`
                              : offer.is_price_range &&
                                (offer.amount_min || offer.price_min) &&
                                (offer.amount_max || offer.price_max)
                              ? `${Number(
                                  offer.amount_min || offer.price_min
                                ).toLocaleString("en-US")} – ${Number(
                                  offer.amount_max || offer.price_max
                                ).toLocaleString("en-US")} ${offer.currency}`
                              : "Quote Required"}
                          </div>

                          {!offer.is_complete_total &&
                            offer.missing_cost_components.length > 0 && (
                              <span className="text-[11px] text-[#A26012] block mt-1">
                                Unconfirmed:{" "}
                                {offer.missing_cost_components.join(", ")}
                              </span>
                            )}

                          {offer.recommendation_breakdown && (
                            <div className="mt-2 inline-block rounded bg-[#F0ECE2] px-2 py-1 text-[11px] font-mono text-[#172D44]">
                              Composite Score:{" "}
                              <strong>
                                {(
                                  offer.recommendation_breakdown
                                    .composite_score * 100
                                ).toFixed(1)}{" "}
                                / 100
                              </strong>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() =>
                              setQuoteModalTarget({
                                supplierName: offer.display_name,
                                countryCode: offer.country_code,
                                productName:
                                  offer.product_name || offer.display_name,
                                quantitySummary:
                                  activeTab === "ready_mix"
                                    ? `${volumeValue} ${volumeUnit} Ready-Mix`
                                    : `${quantityValue} ${quantityUnit}`,
                                sourceUrl: offer.source_url,
                                referencePriceNote:
                                  offer.reference_subtotal !== null
                                    ? `Reference subtotal: ${Number(
                                        offer.reference_subtotal
                                      ).toLocaleString("en-US")} ${offer.currency}`
                                    : undefined,
                              })
                            }
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#176B65] hover:bg-[#125651] text-white px-4 py-2.5 text-xs font-bold shadow-xs transition-all"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>
                              {offer.is_complete_total
                                ? "Prepare Order Sheet"
                                : "Prepare Quote Request"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleOpenReviews(
                                offer.supplier_id,
                                offer.display_name
                              )
                            }
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D8DFDF] bg-white hover:bg-[#F7F5EF] px-3 py-2 text-xs font-semibold text-[#172D44]"
                          >
                            <MessageSquarePlus className="h-3.5 w-3.5" />
                            <span>Customer Reviews</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PROGRESSIVE DISCOVERY TIER 1: VERIFIED LOCAL BRANCHES & RETAIL OUTLETS */}
        {localBranches.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-[#172D44] flex items-center gap-2">
                  <Store className="h-5 w-5 text-[#176B65]" />
                  <span>
                    Verified Local Branches, Plants &amp; Retail Outlets in{" "}
                    {selectedCountryMeta?.country_name || countryCode} (
                    {localBranches.length})
                  </span>
                </h2>
                <p className="text-xs text-[#536574] mt-0.5">
                  Physical plants, depots, and hardware stores verified for{" "}
                  {selectedCountryMeta?.country_name || countryCode}. Only
                  branches with verified coordinates are plotted as exact map
                  points.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localBranches.map((br) => {
                const isMapped = Boolean(
                  br.eligible_for_nearest ?? br.has_exact_coordinates
                );
                const roleLabel =
                  br.location_role_label ||
                  (br.branch_type || br.location_role || "branch").replace(
                    /_/g,
                    " "
                  );
                const branchTitle =
                  br.display_name || br.branch_name || br.branch_id;
                const branchAddr = [
                  br.address_text || br.address,
                  br.city,
                  br.admin1,
                ]
                  .filter(Boolean)
                  .join(", ");
                const branchPhone = br.phone_e164 || br.phone;
                const branchNote = br.notes || br.stock_availability_note;
                return (
                  <div
                    key={br.branch_id}
                    className="rounded-2xl border border-[#D8DFDF] bg-white p-5 flex flex-col justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-md bg-[#E3F2EF] px-2.5 py-0.5 text-[11px] font-bold uppercase text-[#176B65]">
                          {roleLabel}
                        </span>
                        <span
                          className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold ${
                            isMapped
                              ? "bg-[#E6F4ED] text-[#1E6F50]"
                              : "bg-[#F0ECE2] text-[#536574]"
                          }`}
                        >
                          {isMapped
                            ? "✓ Mapped Store Coordinates"
                            : "City / Address Level"}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#172D44]">
                        {branchTitle}
                      </h3>

                      <p className="text-xs text-[#536574] flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#176B65] shrink-0" />
                        <span>{branchAddr || br.distance_label}</span>
                      </p>

                      <p className="text-xs font-mono text-[#176B65]">
                        {br.distance_label}
                      </p>

                      {branchNote && (
                        <p className="text-xs text-[#536574]">
                          <strong>Verification &amp; Access:</strong>{" "}
                          {branchNote}
                        </p>
                      )}

                      {branchPhone && (
                        <p className="text-xs text-[#172D44] font-mono">
                          Phone: {branchPhone}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#F0ECE2] flex items-center justify-between gap-2 text-xs">
                      {br.website_url || br.source_url ? (
                        <a
                          href={br.website_url || br.source_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#176B65] hover:underline"
                        >
                          <span>Branch Page / Source</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span />
                      )}

                      {isMapped &&
                        br.latitude !== null &&
                        br.longitude !== null && (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${br.latitude}&mlon=${br.longitude}#map=15/${br.latitude}/${br.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-[#F0ECE2] px-2.5 py-1 font-mono text-[11px] font-bold text-[#172D44] hover:bg-[#E5DFD2]"
                          >
                            <MapPin className="h-3 w-3 text-[#A65429]" />
                            <span>
                              {br.latitude.toFixed(4)},{" "}
                              {br.longitude.toFixed(4)}
                            </span>
                          </a>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HONEST MAP SEED & COORDINATE VERIFICATION SUMMARY */}
        {searchResult?.map_summary && (
          <div className="rounded-2xl border border-[#D8DFDF] bg-white p-5 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#176B65]" />
                <h2 className="text-sm font-black uppercase tracking-wider text-[#172D44]">
                  Verified Store Coordinate Map Layer (
                  {searchResult.map_summary.verified_store_pin_count ??
                    searchResult.map_summary.verified_coordinate_branch_count ??
                    0}{" "}
                  Verified Pin(s) in {countryCode})
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-[#536574]">
                Zero Fabricated Map Pins
              </span>
            </div>
            <p className="text-xs text-[#536574]">
              {searchResult.map_summary.policy_note ||
                searchResult.map_summary.honesty_note}
            </p>
            {(searchResult.map_summary.verified_store_pins ?? []).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {(searchResult.map_summary.verified_store_pins ?? []).map(
                  (pin, i) => (
                    <div
                      key={pin.branch_id || i}
                      className="rounded-xl border border-[#176B65]/30 bg-[#E3F2EF]/40 p-3.5 text-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-[#172D44]">
                          {pin.display_name || pin.branch_name}
                        </div>
                        <div className="text-[#536574]">
                          {pin.address_text || pin.address}, {pin.city} (
                          {pin.country_code})
                        </div>
                        {pin.latitude !== null && pin.longitude !== null && (
                          <div className="font-mono text-[11px] text-[#176B65] mt-0.5">
                            GeoJSON Point: {pin.latitude.toFixed(4)}° N,{" "}
                            {pin.longitude.toFixed(4)}° E
                          </div>
                        )}
                      </div>
                      {pin.latitude !== null && pin.longitude !== null && (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${pin.latitude}&mlon=${pin.longitude}#map=15/${pin.latitude}/${pin.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-[#176B65] text-white px-3 py-1.5 font-bold shrink-0 hover:bg-[#125651]"
                        >
                          Open Map
                        </a>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* PROGRESSIVE DISCOVERY TIER 2 & 3: SERVICE-AREA SUPPLIERS & COUNTRY BUYING CHANNELS */}
        {directoryLeads.length > 0 && (
          <div className="space-y-4 pt-4">
            <div>
              <h2 className="text-lg font-black text-[#172D44] flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#A65429]" />
                <span>
                  Verified Service-Area Suppliers &amp; Country Buying Channels
                  in {selectedCountryMeta?.country_name || countryCode} (
                  {directoryLeads.length})
                </span>
              </h2>
              <p className="text-xs text-[#536574] mt-0.5">
                These verified manufacturers, batching networks, and national
                construction marketplaces operate in{" "}
                {selectedCountryMeta?.country_name || countryCode}. Headquarters
                or regional coverage entries are never shown as nearby retail
                branches without verified coordinates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {directoryLeads.map((sup) => (
                <div
                  key={sup.supplier_id}
                  className="rounded-2xl border border-[#D8DFDF] bg-white p-5 flex flex-col justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-md bg-[#F0ECE2] px-2.5 py-0.5 text-[11px] font-bold uppercase text-[#172D44]">
                        {(
                          sup.discovery_tier_label ||
                          sup.channel_type ||
                          sup.record_type ||
                          "supplier"
                        ).replace(/_/g, " ")}
                      </span>
                      <span className="rounded-md bg-[#FBF3E4] px-2.5 py-0.5 text-[11px] font-bold text-[#A26012]">
                        {sup.availability?.label ||
                          sup.availability_badge ||
                          sup.price_status_label ||
                          "Quote Required"}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#172D44]">
                      {sup.display_name}
                    </h3>

                    {sup.product_categories_confirmed &&
                      sup.product_categories_confirmed.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {sup.product_categories_confirmed.map((cat) => (
                            <span
                              key={cat}
                              className="rounded bg-[#F7F5EF] border border-[#D8DFDF] px-2 py-0.5 text-[10px] font-mono text-[#536574]"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}

                    <p className="text-xs text-[#536574]">
                      {sup.distance_label}
                    </p>

                    {sup.notes && sup.notes.length > 0 && (
                      <div className="text-xs text-[#536574] space-y-1 bg-[#F7F5EF] p-2.5 rounded-lg border border-[#D8DFDF]">
                        {sup.notes.filter(Boolean).map((n, idx3) => (
                          <p key={idx3}>{n}</p>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenReviews(sup.supplier_id, sup.display_name)
                        }
                        className="inline-flex items-center gap-1 text-[#536574] hover:text-[#176B65] underline"
                      >
                        <Star className="h-3.5 w-3.5 text-[#A26012]" />
                        <span>{sup.review_summary.label}</span>
                      </button>

                      {sup.source_url && (
                        <a
                          href={sup.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#176B65] hover:underline font-semibold"
                        >
                          <span>Supplier Website / Evidence</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F0ECE2] flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setQuoteModalTarget({
                          supplierName: sup.display_name,
                          countryCode: sup.country_code,
                          productName:
                            activeTab === "ready_mix"
                              ? "Ready-Mixed Concrete"
                              : INGREDIENT_CATEGORIES.find(
                                  (c) => c.key === productCategory
                                )?.label || productCategory,
                          quantitySummary:
                            activeTab === "ready_mix"
                              ? `${volumeValue} ${volumeUnit}`
                              : `${quantityValue} ${quantityUnit}`,
                          sourceUrl: sup.source_url,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#172D44] text-white px-4 py-2 text-xs font-bold hover:opacity-90"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Prepare Quote Request</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAGINATION BAR */}
        {searchResult?.pagination &&
          searchResult.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-[#D8DFDF] bg-white px-5 py-3.5 text-xs">
              <span className="text-[#536574]">
                Page <strong>{searchResult.pagination.page}</strong> of{" "}
                <strong>{searchResult.pagination.total_pages}</strong> (
                {searchResult.pagination.total_results ??
                  searchResult.pagination.total_offers}{" "}
                total records)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!searchResult.pagination.has_prev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] px-3 py-1.5 font-bold text-[#172D44] disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={!searchResult.pagination.has_next}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] px-3 py-1.5 font-bold text-[#172D44] disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
      </div>

      {/* QUOTE REQUEST PREPARATION MODAL */}
      {quoteModalTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Prepare Quote Request"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172D44]/60 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#D8DFDF] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#D8DFDF] pb-3">
              <h3 className="text-base font-black text-[#172D44]">
                Prepare Supplier Quote Request (RFQ)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setQuoteModalTarget(null);
                  setCopiedQuote(false);
                }}
                className="text-xs font-bold text-[#536574] hover:text-[#172D44]"
              >
                Close ✕
              </button>
            </div>

            <div className="rounded-xl bg-[#F7F5EF] border border-[#D8DFDF] p-4 font-mono text-xs space-y-1.5 text-[#172D44]">
              <p>
                <strong>To Supplier:</strong> {quoteModalTarget.supplierName} (
                {quoteModalTarget.countryCode})
              </p>
              <p>
                <strong>Material / Specification:</strong>{" "}
                {quoteModalTarget.productName}
              </p>
              <p>
                <strong>Required Quantity:</strong>{" "}
                {quoteModalTarget.quantitySummary}
              </p>
              <p>
                <strong>Delivery Destination:</strong>{" "}
                {selectedLocality?.display_label ||
                  locationQuery ||
                  selectedCountryMeta?.country_name ||
                  countryCode}
              </p>
              {quoteModalTarget.referencePriceNote && (
                <p>
                  <strong>Published Reference Note:</strong>{" "}
                  {quoteModalTarget.referencePriceNote}
                </p>
              )}
              <p className="pt-2 text-[#536574] font-sans">
                Please confirm current unit price, minimum order quantity,
                branch dispatch address, delivery fee to project site, and
                applicable VAT/sales tax.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              {quoteModalTarget.sourceUrl ? (
                <a
                  href={quoteModalTarget.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#176B65] hover:underline"
                >
                  <span>Open Supplier Page</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={() => {
                  const text = `RFQ — ${quoteModalTarget.supplierName}\nProduct: ${quoteModalTarget.productName}\nQuantity: ${quoteModalTarget.quantitySummary}\nLocation: ${
                    selectedLocality?.display_label ||
                    locationQuery ||
                    countryCode
                  }\nPlease confirm unit price, branch stock, delivery cost, and VAT.`;
                  navigator.clipboard?.writeText(text);
                  setCopiedQuote(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#176B65] text-white px-4 py-2 text-xs font-bold"
              >
                {copiedQuote ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied RFQ to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy RFQ Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENUINE CUSTOMER REVIEWS MODAL */}
      {reviewModalSupplier && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Supplier Customer Reviews"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172D44]/60 p-4 overflow-y-auto"
        >
          <div className="w-full max-w-xl rounded-2xl border border-[#D8DFDF] bg-white p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#D8DFDF] pb-3">
              <div>
                <h3 className="text-base font-black text-[#172D44]">
                  Customer Reviews · {reviewModalSupplier.supplierName}
                </h3>
                <p className="text-xs text-[#536574]">
                  Only verified purchase reviews moderated for authenticity are
                  displayed. External map ratings are never imported.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalSupplier(null)}
                className="text-xs font-bold text-[#536574] hover:text-[#172D44]"
              >
                Close ✕
              </button>
            </div>

            {/* Existing Approved Verified Reviews */}
            {supplierReviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D8DFDF] bg-[#F7F5EF] p-5 text-center text-xs text-[#536574]">
                <strong>No reviews yet</strong> — This supplier has 0 verified
                customer reviews in AstraMix Market.
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {supplierReviews.map((rev) => (
                  <div
                    key={rev.review_id}
                    className="rounded-xl border border-[#D8DFDF] p-3.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#172D44]">
                        {rev.reviewer_display_name}
                      </span>
                      <span className="font-mono text-[#A26012] font-bold">
                        Service: {rev.service_rating}/5 · Material:{" "}
                        {rev.material_rating}/5
                      </span>
                    </div>
                    <p className="text-[#536574]">{rev.review_text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Submit Verified Purchase Review Form */}
            <form
              onSubmit={handleSubmitReview}
              className="border-t border-[#D8DFDF] pt-4 space-y-3 text-xs"
            >
              <h4 className="font-bold text-[#172D44]">
                Submit a Verified Purchase Review
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-[#172D44]">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={reviewForm.reviewerDisplayName}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        reviewerDisplayName: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] px-3 py-1.5 text-[#172D44]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[#172D44]">
                    Invoice / Order Reference (Required for verification)
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    placeholder="e.g. INV-2026-0491"
                    value={reviewForm.orderReference}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        orderReference: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] px-3 py-1.5 font-mono text-[#172D44]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-[#172D44]">
                    Delivery &amp; Service Rating (1–5)
                  </label>
                  <select
                    value={reviewForm.serviceRating}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        serviceRating: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] px-3 py-1.5 font-bold text-[#172D44]"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[#172D44]">
                    Material Quality Rating (1–5)
                  </label>
                  <select
                    value={reviewForm.materialRating}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        materialRating: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] px-3 py-1.5 font-bold text-[#172D44]"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#172D44]">
                  Review Details (Batch consistency, delivery punctuality,
                  documentation)
                </label>
                <textarea
                  required
                  minLength={10}
                  rows={3}
                  value={reviewForm.reviewText}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, reviewText: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#D8DFDF] bg-[#F7F5EF] px-3 py-1.5 text-[#172D44]"
                />
              </div>

              {reviewSubmitMessage && (
                <div className="rounded-lg bg-[#E6F0F7] border border-[#205E8A]/30 p-2.5 text-[#172D44]">
                  {reviewSubmitMessage}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-[#176B65] hover:bg-[#125651] text-white px-4 py-2 font-bold"
                >
                  Submit Review for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
