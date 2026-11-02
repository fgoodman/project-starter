import { createContext } from 'preact';
import { useContext, useState } from 'preact/hooks';

export class AppModel {
  // Add domain managers here as your app grows
  // Example:
  // #user: UserStore;
  //
  // constructor() {
  //   this.#user = new UserStore(this);
  // }
  //
  // get user() {
  //   return this.#user;
  // }
}

const StoreContext = createContext<AppModel>(null!);

export function StoreProvider({ children }: { children: preact.ComponentChildren }) {
  const [store] = useState(() => new AppModel());
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
