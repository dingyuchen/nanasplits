This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## TODOs

- [ ] expense validation
- [x] expense date picker
- [ ] edit splits
- [ ] split by types
- [ ] split validation
- [ ] Tally amounts correctly, tally different currencies separately
    - [ ] all tallies are grouped by currency
    - [ ] incoming and outgoing per member != self, per currency
    - [ ] aggregate per currency for total incoming, outgoing
- [ ] Fix `app/[id]` page
- [ ] Settle up per group
    - [ ] aggregate tally for total incoming, outgoing
- [ ] Request to settle
    - [ ] profile settings page
        - [ ] allow edit signature
    - [ ] Send a messsage with group tally (aggregated on self only)
        - [ ] include mention, value per user
    - [ ] supply button for triggering transfer expense

---
- [ ] expense categories/tag
- [ ] /intro bot command
- [ ] currency conversion
- [ ] use preloaded querying for group page
- [ ] notify when all members have joined
- [ ] clear group and associated data when "leave" event is detected
- [ ] simplify transactions
- [ ] group settings page

### Moonshot

- [ ] use AI to create an expense given receipt and natural language description of split

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
