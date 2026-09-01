import { Metadata } from "next";
import { BetonKayakApp } from "@/components/BetonKayakApp";

export const metadata: Metadata = {
  title: "BetonKayak — Armenia Concrete Mix, Cost & Carbon Optimizer",
  description:
    "Real-time concrete mix aggregator and optimizer tailored for the Armenian construction market. Compare Ararat M400, Iranian M500, bulk vs bagged delivery, embodied carbon, and structural strength.",
};

export default function BetonKayakPage() {
  return <BetonKayakApp />;
}
