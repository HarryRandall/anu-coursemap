# Re-pulling the vendored Untitled UI source

The vendored tree at `components/design-system/untitled/` is upstream source. It
is excluded from Prettier and ESLint so it stays byte-comparable with the commit
recorded in `provenance.md`. Do not hand-edit it.

## To update it

1. Create a scaffold outside this repository:

   ```bash
   mkdir uui-scaffold && cd uui-scaffold
   echo '{"name":"uui-scaffold","private":true,"type":"module"}' > package.json
   echo '{"tsx":true,"version":"8","aliases":{"components":"@/components","utils":"@/utils","hooks":"@/hooks","styles":"@/styles"}}' > components.json
   echo '{"compilerOptions":{"baseUrl":".","paths":{"@/*":["./*"]}}}' > tsconfig.json
   ```

2. Run the CLI with the component list from `provenance.md`.

3. Copy `components/`, `utils/` and `hooks/` over the vendored tree, and fetch
   `styles/theme.css` and `styles/typography.css` from the repository at the new
   commit.

4. Re-apply the import prefix:

   ```bash
   find components/design-system/untitled -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 \
     | xargs -0 sed -i '' \
         -e 's|from "@/components/|from "@uui/components/|g' \
         -e 's|from "@/utils/|from "@uui/utils/|g' \
         -e 's|from "@/hooks/|from "@uui/hooks/|g'
   ```

5. Re-apply the brand substitution in `styles/theme.css`. Only the eleven
   `--color-brand-*` literals change; the comment above them explains why.

6. Update the commit, date and CLI version in `provenance.md`.

7. Run `npx tsc --noEmit` and walk `/design-system` in both themes. Upstream
   sometimes changes a component's props, and the laboratory sections are the
   only consumers that will fail loudly.

## To check for drift

```bash
grep -rn 'from "@/' components/design-system/untitled   # should be empty
```

Any other difference from upstream, other than the import prefix and the brand
ramp, is drift and should be reverted rather than accommodated.
