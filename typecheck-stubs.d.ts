declare var process: { env: Record<string, string | undefined>; cwd(): string }

declare namespace React {
  type ReactNode = any
  type ComponentType<P = any> = (props: P) => any
  type SetStateAction<S> = S | ((prevState: S) => S)
  type Dispatch<A> = (value: A) => void
  interface FormEvent<T = Element> { preventDefault(): void; currentTarget: T; target: EventTarget }
  interface ChangeEvent<T = Element> { target: T; currentTarget: T }
  interface MouseEvent<T = Element> { stopPropagation(): void; target: EventTarget; currentTarget: T }
  interface RefObject<T> { current: T | null }
}

type JSXProps = {
  children?: any
  onChange?: (event: any) => any
  onClick?: (event: any) => any
  onSubmit?: (event: any) => any
  onMouseDown?: (event: any) => any
  onInput?: (event: any) => any
  onKeyDown?: (event: any) => any
  ref?: any
  [key: string]: any
}

declare namespace JSX {
  interface Element {}
  interface ElementClass { render: any }
  interface ElementAttributesProperty { props: {} }
  interface IntrinsicElements { [elemName: string]: JSXProps }
}

declare module 'react' {
  export type ReactNode = React.ReactNode
  export type ComponentType<P = any> = React.ComponentType<P>
  export type FormEvent<T = Element> = React.FormEvent<T>
  export type ChangeEvent<T = Element> = React.ChangeEvent<T>
  export type MouseEvent<T = Element> = React.MouseEvent<T>
  export function useState<S>(initialState: S | (() => S)): [S, React.Dispatch<React.SetStateAction<S>>]
  export function useState<S = undefined>(): [S | undefined, React.Dispatch<React.SetStateAction<S | undefined>>]
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly unknown[]): T
  export function useRef<T>(initialValue: T | null): React.RefObject<T>
}

declare module 'react/jsx-runtime' {
  export const Fragment: any
  export function jsx(type: any, props: any, key?: any): any
  export function jsxs(type: any, props: any, key?: any): any
}

declare module 'next/link' { const Link: React.ComponentType<any>; export default Link }
declare module 'next/navigation' {
  export function useRouter(): any
  export function usePathname(): string
  export function redirect(path: string): never
}
declare module 'next/server' {
  export class NextRequest { headers: { get(name: string): string | null }; json(): Promise<any> }
  export class NextResponse { static json(body: any, init?: any): any }
}

type SupabaseResult<T = any> = { data: T; error: any; count: number | null }
interface SupabaseQuery<T = any> extends PromiseLike<SupabaseResult<T>> {
  select(...args: any[]): SupabaseQuery<any>
  insert(...args: any[]): SupabaseQuery<any>
  update(...args: any[]): SupabaseQuery<any>
  delete(...args: any[]): SupabaseQuery<any>
  eq(...args: any[]): SupabaseQuery<T>
  neq(...args: any[]): SupabaseQuery<T>
  in(...args: any[]): SupabaseQuery<T>
  order(...args: any[]): SupabaseQuery<T>
  limit(...args: any[]): SupabaseQuery<T>
  range(...args: any[]): SupabaseQuery<T>
  maybeSingle(...args: any[]): SupabaseQuery<any>
  single(...args: any[]): SupabaseQuery<any>
}
interface SupabaseClientStub {
  from(table: string): SupabaseQuery<any>
  rpc(name: string, args?: any): SupabaseQuery<any>
  auth: any
  channel(name: string): any
  removeChannel(channel: any): any
}
declare module '@supabase/supabase-js' {
  export type SupabaseClient = SupabaseClientStub
  export function createClient(...args: any[]): SupabaseClientStub
}

declare module 'lucide-react' {
  export const Building2: React.ComponentType<any>
  export const Edit3: React.ComponentType<any>
  export const MapPin: React.ComponentType<any>
  export const Plus: React.ComponentType<any>
  export const Printer: React.ComponentType<any>
  export const QrCode: React.ComponentType<any>
  export const AlertCircle: React.ComponentType<any>
  export const Download: React.ComponentType<any>
  export const Link2: React.ComponentType<any>
  export const RefreshCw: React.ComponentType<any>
  export const Search: React.ComponentType<any>
  export const BarChart3: React.ComponentType<any>
  export const Boxes: React.ComponentType<any>
  export const ClipboardCheck: React.ComponentType<any>
  export const FileClock: React.ComponentType<any>
  export const FileSpreadsheet: React.ComponentType<any>
  export const FolderSync: React.ComponentType<any>
  export const History: React.ComponentType<any>
  export const LayoutDashboard: React.ComponentType<any>
  export const LogOut: React.ComponentType<any>
  export const Menu: React.ComponentType<any>
  export const Package: React.ComponentType<any>
  export const PackageSearch: React.ComponentType<any>
  export const ScanLine: React.ComponentType<any>
  export const Settings: React.ComponentType<any>
  export const ShieldCheck: React.ComponentType<any>
  export const Tags: React.ComponentType<any>
  export const TriangleAlert: React.ComponentType<any>
  export const Users: React.ComponentType<any>
  export const Warehouse: React.ComponentType<any>
  export const X: React.ComponentType<any>
  export const Construction: React.ComponentType<any>
  export const Eye: React.ComponentType<any>
  export const EyeOff: React.ComponentType<any>
  export const LoaderCircle: React.ComponentType<any>
  export const LockKeyhole: React.ComponentType<any>
  export const UserRound: React.ComponentType<any>
}

declare module 'qrcode.react' { export const QRCodeSVG: React.ComponentType<any> }
declare module 'xlsx' { const xlsx: any; export = xlsx }
declare module 'node:fs' { const fs: any; export default fs }
declare module 'node:path' { const path: any; export default path }
