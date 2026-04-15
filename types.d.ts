// Allow TypeScript to resolve side-effect CSS imports (e.g. govuk-frontend)
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
