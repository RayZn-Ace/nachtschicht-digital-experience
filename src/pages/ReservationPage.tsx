import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ScrollReveal from "@/components/ScrollReveal";
import { CalendarDays, Users, Wine } from "lucide-react";

const reservationSchema = z.object({
  name: z.string().trim().min(2, "Bitte gib deinen Namen ein").max(100),
  email: z.string().trim().email("Bitte gib eine gültige E-Mail ein").max(255),
  phone: z.string().trim().max(30).optional(),
  date: z.string().min(1, "Bitte wähle ein Datum"),
  guest_count: z.coerce.number().min(1, "Mind. 1 Gast").max(50, "Max. 50 Gäste"),
  lounge_type: z.string().min(1, "Bitte wähle eine Lounge"),
  message: z.string().trim().max(1000).optional(),
});

type ReservationForm = z.infer<typeof reservationSchema>;

const loungeOptions = [
  { value: "vip_classic", label: "VIP Lounge Classic (bis 10 Pers.)" },
  { value: "vip_premium", label: "VIP Lounge Premium (bis 20 Pers.)" },
  { value: "vip_table", label: "VIP Tisch (bis 6 Pers.)" },
];

const ReservationPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReservationForm>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      date: "",
      guest_count: 2,
      lounge_type: "",
      message: "",
    },
  });

  const onSubmit = async (data: ReservationForm) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("reservations").insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        date: data.date,
        guest_count: data.guest_count,
        lounge_type: data.lounge_type,
        message: data.message || null,
      });

      if (error) throw error;

      toast.success("Reservierung gesendet!", {
        description: "Wir melden uns in Kürze bei dir.",
      });
      form.reset();
    } catch {
      toast.error("Fehler beim Senden. Bitte versuche es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Minimum date = tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <section className="section-padding">
      <div className="container mx-auto max-w-2xl">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-7xl tracking-wider text-foreground">
              VIP <span className="text-gradient">RESERVIERUNG</span>
            </h1>
            <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full" />
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
              Sichere dir deinen VIP-Bereich für einen unvergesslichen Abend. Fülle das Formular aus und wir melden uns bei dir.
            </p>
          </div>
        </ScrollReveal>

        {/* Highlights */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { icon: Wine, label: "Bottle Service" },
              { icon: Users, label: "Privater Bereich" },
              { icon: CalendarDays, label: "Flexible Termine" },
            ].map((item) => (
              <div key={item.label} className="glass-card p-4 text-center">
                <item.icon className="mx-auto mb-2 text-primary" size={28} />
                <p className="text-xs md:text-sm text-muted-foreground font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Form */}
        <ScrollReveal delay={0.2}>
          <div className="glass-card p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Dein Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-Mail *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="deine@email.de" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+49 ..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Datum *</FormLabel>
                        <FormControl>
                          <Input type="date" min={minDateStr} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="guest_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anzahl Gäste *</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={50} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lounge_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lounge / Tisch *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Bitte wählen" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {loungeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nachricht / Anlass</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="z.B. Geburtstag, JGA, besondere Wünsche..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full font-display text-lg tracking-wider py-6"
                  size="lg"
                >
                  {isSubmitting ? "WIRD GESENDET..." : "RESERVIERUNG ABSENDEN"}
                </Button>
              </form>
            </Form>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default ReservationPage;
