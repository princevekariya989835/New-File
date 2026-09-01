import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

export interface CustomerOrderConfirmationProps {
  orderNumber?: string;
  createdAt?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string | null;
  shippingAddress?: string;
  paymentMethod?: string;
  subtotal?: string;
  shippingCharge?: string;
  total?: string;
  currency?: string;
  hasCustomDesign?: boolean;
  items?: Array<{
    name: string;
    quantity: number;
    size?: string | null;
    color?: string | null;
    price: string;
    subtotal: string;
    isCustomDesign?: boolean;
  }>;
}

function CustomerOrderConfirmationEmail(props: CustomerOrderConfirmationProps) {
  const items = props.items ?? [];
  const currency = props.currency ?? "INR";
  return (
    <Html>
      <Head />
      <Preview>
        Order Confirmed — Invoice {props.orderNumber ?? ""} ({props.total ?? ""} {currency})
      </Preview>
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            margin: "24px auto",
            padding: "24px",
            maxWidth: 560,
            borderRadius: "8px",
          }}
        >
          <Heading style={{ fontSize: 22, margin: "0 0 4px", color: "#111" }}>
            RIOT<span style={{ color: "#f00b11" }}>O</span>US — Order Confirmation & Invoice
          </Heading>
          <Text style={{ color: "#666", marginTop: 0, fontSize: 14 }}>
            Thank you for your order! Order #{props.orderNumber} placed on {props.createdAt}.
          </Text>
          <Hr style={{ borderColor: "#eaeaea", margin: "20px 0" }} />
          <Section>
            <Text style={{ margin: "4px 0", fontSize: 14, color: "#333" }}>
              <strong>Shipping Details:</strong>
            </Text>
            <Text style={{ margin: "2px 0", fontSize: 14, color: "#555" }}>
              {props.customerName} ({props.customerEmail}
              {props.customerPhone ? `, ${props.customerPhone}` : ""})
            </Text>
            <Text style={{ margin: "2px 0", fontSize: 14, color: "#555" }}>
              {props.shippingAddress}
            </Text>
            <Text style={{ margin: "4px 0", fontSize: 14, color: "#333", marginTop: "10px" }}>
              <strong>Payment Method:</strong> {props.paymentMethod ?? "Cash on Delivery (COD)"}
            </Text>
          </Section>
          <Hr style={{ borderColor: "#eaeaea", margin: "20px 0" }} />
          <Section>
            <Text style={{ margin: "0 0 8px", fontSize: 15, fontWeight: "bold", color: "#111" }}>
              Order Items / Invoice Summary:
            </Text>
            {items.map((item, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                <Text style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: "#222" }}>
                  {item.quantity} × {item.name}
                  {item.size ? ` (Size: ${item.size})` : ""}
                  {item.color ? ` (Color: ${item.color})` : ""}
                  {item.isCustomDesign ? " [Custom Design]" : ""}
                </Text>
                <Text style={{ margin: 0, fontSize: 13, color: "#666" }}>
                  Price: {item.price} {currency} each — Subtotal: {item.subtotal} {currency}
                </Text>
              </div>
            ))}
          </Section>
          <Hr style={{ borderColor: "#eaeaea", margin: "20px 0" }} />
          <Section style={{ textAlign: "right" }}>
            <Text style={{ margin: "4px 0", fontSize: 14, color: "#555" }}>
              Subtotal: {props.subtotal} {currency}
            </Text>
            <Text style={{ margin: "4px 0", fontSize: 14, color: "#555" }}>
              Shipping: {props.shippingCharge} {currency}
            </Text>
            <Text style={{ margin: "8px 0 0", fontSize: 18, fontWeight: "bold", color: "#111" }}>
              Total: {props.total} {currency}
            </Text>
          </Section>
          <Hr style={{ borderColor: "#eaeaea", margin: "20px 0" }} />
          <Text style={{ textAlign: "center", fontSize: 12, color: "#888", margin: 0 }}>
            If you have any questions, reply to this email or contact support at
            support@riotous.com.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: CustomerOrderConfirmationEmail,
  subject: (d: Record<string, any>) =>
    `Order Confirmation & Invoice #${d.orderNumber ?? ""} — RIOTOUS`,
  displayName: "Customer order confirmation & invoice",
  previewData: {
    orderNumber: "RIO-ABCD1234",
    createdAt: new Date().toLocaleString("en-IN"),
    customerName: "Aarav Shah",
    customerEmail: "customer@example.com",
    customerPhone: "+91 98765 43210",
    shippingAddress: "12 Ring Road, Surat, Gujarat 395002",
    paymentMethod: "COD",
    subtotal: "2398",
    shippingCharge: "0",
    total: "2398",
    currency: "INR",
    hasCustomDesign: false,
    items: [
      {
        name: "Zoro Black Tee",
        quantity: 1,
        size: "L",
        color: "Black",
        price: "1199",
        subtotal: "1199",
      },
      {
        name: "Luffy Straw Hat Tee",
        quantity: 1,
        size: "M",
        color: "White",
        price: "1199",
        subtotal: "1199",
      },
    ],
  } satisfies CustomerOrderConfirmationProps,
} satisfies TemplateEntry;
