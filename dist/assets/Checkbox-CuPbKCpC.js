import{r as e}from"./rolldown-runtime-S-ySWqyJ.js";import{rt as t}from"./vendor-Y6SgQ0Y8.js";import{i as n}from"./vendor-react-2SHIJeLP.js";import{G as r}from"./vendor-lucide-CfIKqoEg.js";var i=e(t(),1),a=n(),o=({label:e,description:t,checked:n,onCheckedChange:o,align:s=`start`,className:c=``,id:l,disabled:u,...d})=>{let f=(0,i.useId)(),p=l||f;return(0,a.jsxs)(`label`,{htmlFor:p,className:`
        group relative flex cursor-pointer gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 transition-all
        hover:border-primary/50 hover:bg-zinc-900/80
        ${s===`between`?`items-center justify-between`:`items-start`}
        ${u?`cursor-not-allowed opacity-60`:``}
        ${c}
      `,children:[(0,a.jsxs)(`span`,{className:`min-w-0 ${s===`between`?`order-1`:`order-2 flex-1`}`,children:[(0,a.jsx)(`span`,{className:`block text-sm font-semibold text-white`,children:e}),t&&(0,a.jsx)(`span`,{className:`mt-0.5 block text-xs leading-relaxed text-zinc-500`,children:t})]}),(0,a.jsx)(`span`,{className:`
          order-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all
          group-focus-within:ring-2 group-focus-within:ring-primary/25
          ${n?`border-primary bg-primary text-black shadow-glow`:`border-zinc-700 bg-zinc-900 text-transparent group-hover:border-primary/70`}
          ${s===`between`?`order-2`:``}
        `,children:(0,a.jsx)(r,{size:14,strokeWidth:3})}),(0,a.jsx)(`input`,{id:p,type:`checkbox`,checked:n,disabled:u,onChange:e=>o(e.target.checked),className:`sr-only`,...d})]})};export{o as t};