import {
  BadgeIndianRupee,
  Banknote,
  CalendarCheck,
  CircleX,
  Clock,
  Cookie,
  CreditCard,
  Database,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  IdCard,
  Mail,
  MessageCircle,
  Phone,
  ReceiptIndianRupee,
  ShieldCheck,
  TicketPercent,
  Trash2,
  UserRoundCheck,
  Utensils,
  Wrench,
} from "lucide-react";
import type { LegalSection } from "@/components/site/LegalPage";

export const privacySections: LegalSection[] = [
  { id: "information", title: "Information We Collect", icon: Database, items: ["Customer name", "Mobile number", "Booking details", "Branch selected", "Gaming sessions", "Food orders", "Membership details", "Coupon usage", "Visit history", "Payment status (Cash / UPI)"], extra: { label: "We do not collect or store", items: ["UPI PIN", "Debit or credit card details", "Bank passwords", "OTPs", "Any banking credentials"] } },
  { id: "purpose", title: "Why We Collect Information", icon: UserRoundCheck, items: ["Manage bookings and verify reservations", "Track membership usage and customer visit levels", "Issue rewards and manage coupons", "Contact customers regarding bookings", "Improve customer experience", "Generate business reports"] },
  { id: "loyalty", title: "Customer Loyalty Program", icon: Gift, items: ["Customer phone numbers are used to maintain visit history.", "Free 30 minutes after the 5th visit expires at the 7th visit.", "Free 1 hour after the 10th visit expires at the 12th visit.", "Rewards are calculated automatically using visit history."] },
  { id: "protection", title: "Data Protection", icon: ShieldCheck, items: ["Customer information is securely stored and is only accessible by authorized administrators and branch managers.", "Customer information is never sold or shared with third parties except where required by law."] },
  { id: "whatsapp", title: "WhatsApp Communication", icon: MessageCircle, items: ["Customers may receive booking confirmations, booking reminders, promotional offers or membership updates through WhatsApp.", "Customers may request to stop promotional messages at any time."] },
  { id: "removal", title: "Data Removal", icon: Trash2, items: ["Customers may request deletion of their personal information by contacting the gaming café."] },
];

export const termsSections: LegalSection[] = [
  { id: "booking", title: "Booking", icon: CalendarCheck, items: ["Bookings are confirmed only after admin approval.", "Availability shown online is subject to confirmation."] },
  { id: "payment", title: "Payment", icon: CreditCard, items: ["Customers pay using UPI.", "Payment verification is completed manually by the administrator."] },
  { id: "arrival", title: "Arrival", icon: Clock, items: ["Customers should arrive before their booked slot.", "Late arrivals may result in reduced play time without additional extension."] },
  { id: "cancellation", title: "Cancellation", icon: CircleX, items: ["The gaming café reserves the right to cancel fraudulent or duplicate bookings."] },
  { id: "student", title: "Student Discount", icon: GraduationCap, items: ["Student Discount is applicable only for Gaming Sessions.", "Minimum Gaming Bill ₹1000.", "A valid Student ID must be presented upon arrival.", "Failure to produce a valid Student ID will result in the customer paying the full amount.", "Food items are not eligible for Student Discount."] },
  { id: "memberships", title: "Memberships", icon: IdCard, items: ["Membership hours cannot be exchanged for cash.", "Membership validity begins from the purchase date.", "Unused membership hours expire after validity ends."] },
  { id: "rewards", title: "Loyalty Rewards", icon: Gift, items: ["5th visit: eligible for Free 30 Minutes; expires at the 7th visit.", "10th visit: eligible for Free 1 Hour; expires at the 12th visit.", "Rewards cannot be combined or transferred and have no cash value."] },
  { id: "free-session", title: "Free Session Usage", icon: Gamepad2, items: ["Free rewards can only be redeemed while making a booking.", "A reward can only be applied if enough consecutive slot time is available."] },
  { id: "unlimited", title: "Unlimited Pass", icon: TicketPercent, items: ["Unlimited Pass allows one gaming session of up to one hour per game per day during the 30-day validity period.", "The pass is non-transferable."] },
  { id: "combo", title: "Combo Offers", icon: BadgeIndianRupee, items: ["Combo offers are valid only on the purchase day unless otherwise specified."] },
  { id: "coupons", title: "Coupons", icon: Cookie, items: ["Coupons may apply to Gaming only, Food only, or the Entire Bill.", "Coupon validity and usage limits are determined by the administrator.", "Expired coupons cannot be redeemed."] },
  { id: "food", title: "Food Orders", icon: Utensils, items: ["Food may be ordered separately without booking a gaming session."] },
  { id: "damage", title: "Equipment Damage", icon: Wrench, items: ["Customers are responsible for intentional damage caused to gaming equipment or accessories.", "The gaming café reserves the right to recover repair or replacement costs."] },
  { id: "behaviour", title: "Behaviour", icon: ShieldCheck, items: ["Abusive behaviour, illegal activities, smoking inside restricted areas, or damage to property may result in immediate cancellation without refund."] },
];

export const refundSections: LegalSection[] = [
  { id: "booking-cancellation", title: "Booking Cancellation", icon: CircleX, items: ["Customers may request cancellation before the booking is approved.", "Once a booking has started, refunds are generally not available."] },
  { id: "duplicate", title: "Duplicate Payments", icon: ReceiptIndianRupee, items: ["If a duplicate payment is made, the excess amount will be refunded after verification."] },
  { id: "failed-upi", title: "Failed UPI Payment", icon: Banknote, items: ["If payment fails but the amount is debited, customers should contact Clash of Consoles with the transaction reference.", "Refunds, if applicable, depend on bank confirmation."] },
  { id: "cafe-cancellation", title: "Café Cancellation", icon: CalendarCheck, items: ["If the gaming café cancels a booking due to technical issues, maintenance or operational reasons, customers may choose a full refund or reschedule the booking."] },
  { id: "membership", title: "Membership Refund", icon: IdCard, items: ["Memberships are generally non-refundable after activation."] },
  { id: "coupon", title: "Coupon Refund", icon: TicketPercent, items: ["Coupons and promotional rewards cannot be exchanged for cash."] },
  { id: "processing", title: "Processing Time", icon: HandCoins, items: ["Approved refunds, where applicable, will be processed within a reasonable time after verification."] },
  { id: "contact", title: "Contact", icon: Mail, items: ["Email: Clashofconsoles.gamingcafe@gmail.com", "Phone: 8522006115", "Phone: 9989772103"], extra: { label: "When contacting us", items: ["Include your booking reference and payment transaction reference so we can verify the request."] } },
];

void Phone;