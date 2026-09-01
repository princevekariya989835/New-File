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

export interface OtpEmailProps {
  otp?: string;
  purpose?: "signup" | "forgot_password";
}

function OtpEmail(props: OtpEmailProps) {
  const otp = props.otp ?? "123456";
  const purpose = props.purpose === "forgot_password" ? "Password Reset" : "Account Verification";

  return (
    <Html>
      <Head />
      <Preview>
        Your {purpose} Code: {otp} — RIOTOUS
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
            RIOT<span style={{ color: "#f00b11" }}>O</span>US — {purpose}
          </Heading>
          <Text style={{ color: "#666", marginTop: 0, fontSize: 14 }}>
            Please use the verification code below to complete your {purpose.toLowerCase()}. This
            code is valid for 10 minutes.
          </Text>
          <Hr style={{ borderColor: "#eaeaea", margin: "20px 0" }} />
          <Section style={{ textAlign: "center", margin: "24px 0" }}>
            <Text
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "1px",
                color: "#888",
                margin: "0 0 8px",
              }}
            >
              Verification Code
            </Text>
            <Text
              style={{
                fontSize: 36,
                fontWeight: "bold",
                letterSpacing: "6px",
                color: "#111",
                margin: 0,
                background: "#f8f9fa",
                padding: "16px",
                borderRadius: "8px",
                display: "inline-block",
              }}
            >
              {otp}
            </Text>
          </Section>
          <Hr style={{ borderColor: "#eaeaea", margin: "20px 0" }} />
          <Text style={{ fontSize: 12, color: "#888", margin: 0 }}>
            If you did not request this code, please ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template: TemplateEntry = {
  component: OtpEmail,
  subject: (data) =>
    data.purpose === "forgot_password"
      ? `Password Reset OTP: ${data.otp ?? "123456"} · RIOTOUS`
      : `Account Verification OTP: ${data.otp ?? "123456"} · RIOTOUS`,
  displayName: "OTP Verification Code",
  previewData: {
    otp: "482910",
    purpose: "signup",
  },
};
