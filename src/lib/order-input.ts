export type OrderServiceInput = {
  id?: string;
  description: string;
  price: string;
  mechanicId?: string;
};

export type OrderPartInput = {
  id?: string;
  description: string;
  quantity: string;
  unitCost?: string;
  unitPrice: string;
};

export type SaveOrderInput = {
  orderId?: string;
  clientId?: string;
  newClient?: { name: string; phone: string; email?: string; type: "INDIVIDUAL" | "PARTNER" };
  vehicleId?: string;
  newVehicle?: { plate: string; brand: string; model: string; year?: string; color?: string };
  mileage?: string;
  problemReport: string;
  notes: string;
  discount: string;
  services: OrderServiceInput[];
  parts: OrderPartInput[];
  intent: "draft" | "approval" | "save";
};
