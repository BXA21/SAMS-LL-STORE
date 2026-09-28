import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  make: string;
  weight: string;
  price: number;
  currency: string;
  image: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  addItem: (product: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getTotalAmount: () => number;
}

// Bump whenever product pricing changes so persisted carts cannot show stale prices.
const CART_PRICING_VERSION = 1;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      setIsOpen: (isOpen) => set({ isOpen }),
      addItem: (product, quantity = 1) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item.productId === product.productId);

        if (existingItem) {
          const updatedItems = currentItems.map((item) =>
            item.productId === product.productId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
          set({ items: updatedItems });
        } else {
          set({ items: [...currentItems, { ...product, quantity }] });
        }
        // Auto open cart when item is added
        set({ isOpen: true });
      },
      removeItem: (productId) => {
        const currentItems = get().items;
        set({ items: currentItems.filter((item) => item.productId !== productId) });
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const currentItems = get().items;
        set({
          items: currentItems.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      getTotalAmount: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'sams-cart-storage',
      /*
       * A cart item stores the price it was added at, so a cart left sitting in
       * a browser from before a price change keeps showing the old amount in the
       * drawer and the checkout summary. The server recalculates the real total
       * before taking payment, so the customer is never charged the stale figure,
       * but they should not be shown it either. Bump this version alongside a
       * price change and pre-existing carts are dropped once on next load.
       */
      version: CART_PRICING_VERSION,
      migrate: () => ({ items: [], isOpen: false }),
    }
  )
);
