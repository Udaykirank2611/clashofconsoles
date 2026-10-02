import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import offerPoster from "@/assets/dussehra-special-offer-2026.png.asset.json";

export function DussehraOfferPopup() {
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-auto max-w-[min(94vw,38rem)] gap-0 overflow-hidden rounded-2xl border-cyan/30 bg-background p-0 shadow-[0_30px_100px_-20px_var(--pink)] [&>button]:right-2 [&>button]:top-2 [&>button]:z-10 [&>button]:grid [&>button]:size-10 [&>button]:place-items-center [&>button]:rounded-full [&>button]:bg-background/85 [&>button]:text-foreground [&>button]:opacity-100">
        <DialogTitle className="sr-only">Dussehra special gaming offer</DialogTitle>
        <DialogDescription className="sr-only">
          Special PS5, Cockpit Racing, Virtual Reality, Snooker and Private Theatre prices from 10 AM to 4 PM throughout October.
        </DialogDescription>
        <img
          src={offerPoster.url}
          alt="Dussehra special offer for PS5, Cockpit Racing, Virtual Reality, Snooker and Private Theatre, valid 10 AM to 4 PM throughout October"
          className="max-h-[82svh] w-auto max-w-[94vw] object-contain"
        />
        <div className="flex items-center justify-center border-t border-border bg-background p-3">
          <Button asChild className="h-11 min-w-44 rounded-full px-8 font-extrabold uppercase">
            <Link to="/book" onClick={() => setOpen(false)}>Book this offer</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}