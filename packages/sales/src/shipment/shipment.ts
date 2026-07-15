/**
 * Shipment reference contracts — no logistics implementation.
 */

export type CarrierReference = {
  readonly carrierId: string;
  readonly code: string | null;
  readonly name: string | null;
};

export type DeliveryWindow = {
  readonly startAt: string | null;
  readonly endAt: string | null;
  readonly timezone: string | null;
};

export type ShipmentReference = {
  readonly shipmentId: string;
  readonly companyId: string;
  readonly salesOrderId: string | null;
  readonly deliveryId: string | null;
  readonly carrier: CarrierReference | null;
  readonly window: DeliveryWindow | null;
  readonly trackingRef: string | null;
};
