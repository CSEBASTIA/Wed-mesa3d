// Instancias compartidas de la app y el puente entre el store y React.
import { useSyncExternalStore } from 'react';
import { store } from '../core/store';
import { createActions } from '../core/actions';

export { store };
export const actions = createActions(store);

/**
 * Hace que el componente se vuelva a dibujar con cada cambio del store.
 * Devuelve la versión actual (útil como dependencia de efectos).
 */
export function useStoreVersion(): number {
  return useSyncExternalStore(store.subscribe, store.getVersion);
}
