"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import {
  Search,
  Database,
  LayoutDashboard,
  Download,
  MessageSquare,
  Menu,
  X,
  ChevronDown,
  Chrome,
  Globe,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobFiltrLogo } from "./JobFiltrLogo";
import { cn } from "@/lib/utils";

// Custom database search icon component
const DatabaseSearchIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M10.825 20.975q-1.575-.05-2.987-.375t-2.488-.863T3.638 18.5T3 17q0 .8.638 1.5t1.712 1.238t2.488.862t2.987.375m-1.25-5.125q-.575-.075-1.2-.187t-1.225-.275T6 15t-1-.475q.45.25 1 .475t1.15.388t1.225.275t1.2.187M12 9q2.2 0 4.463-.638T19 7.026q-.275-.725-2.512-1.375T12 5q-2.275 0-4.462.638T5 7.025q.375.725 2.613 1.35T12 9m-9 8V7q0-.825.713-1.55T5.65 4.175t2.863-.862T12 3t3.488.313t2.862.862t1.938 1.275T21 7t-.712 1.55t-1.938 1.275t-2.863.863T12 11q-2.125 0-3.925-.375T5 9.525v2.525q.85.775 2.062 1.2t2.513.6q.425.05.688.35t.262.725q0 .4-.275.688t-.675.237q-1.175-.125-2.425-.462T5 14.525V17q.3.575 1.8 1.088t4.05.762q.425.05.688.375t.262.75t-.275.725t-.7.275q-1.575-.05-2.987-.375t-2.488-.863T3.638 18.5T3 17m13.5 4q-1.875 0-3.187-1.312T12 16.5t1.313-3.187T16.5 12t3.188 1.313T21 16.5q0 .65-.187 1.25T20.3 18.9l2 2q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-2-2q-.55.325-1.15.513T16.5 21m0-2q1.05 0 1.775-.725T19 16.5t-.725-1.775T16.5 14t-1.775.725T14 16.5t.725 1.775T16.5 19"/>
  </svg>
);

// Custom admin icon component
const AdminIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M12 2.15q.2 0 .363.025t.337.1l6 2.25q.575.225.938.725T20 6.375V9.5q0 .425-.287.713T19 10.5t-.712-.288T18 9.5V6.4l-6-2.25L6 6.4v4.7q0 1.25.363 2.5t1 2.375T8.913 18t1.987 1.475q.375.2.538.575t.012.75q-.175.4-.562.55t-.763-.05Q7.3 19.9 5.65 17.075T4 11.1V6.375q0-.625.363-1.125t.937-.725l6-2.25q.175-.075.35-.1T12 2.15M17 22q-2.075 0-3.537-1.463T12 17t1.463-3.537T17 12t3.538 1.463T22 17t-1.463 3.538T17 22m0-5q.625 0 1.063-.437T18.5 15.5t-.437-1.062T17 14t-1.062.438T15.5 15.5t.438 1.063T17 17m0 3q.625 0 1.175-.238t.975-.687q.125-.15.1-.337t-.225-.288q-.475-.225-.987-.337T17 18t-1.037.113t-.988.337q-.2.1-.225.288t.1.337q.425.45.975.688T17 20"/>
  </svg>
);

// Custom Firefox icon component
const FirefoxIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M6.85 6.74q.015 0 0 0M21.28 8.6c-.43-1.05-1.32-2.18-2.01-2.54c.56 1.11.89 2.22 1.02 3.04v.02c-1.13-2.82-3.05-3.96-4.62-6.44c-.08-.12-.17-.25-.24-.38c-.04-.07-.07-.14-.11-.21c-.06-.13-.12-.26-.15-.4c0-.01-.01-.02-.02-.02h-.03c-2.22 1.3-3.15 3.59-3.38 5.04c-.69.04-1.37.21-1.99.51c-.12.05-.17.19-.13.31c.05.14.21.21.34.15c.54-.26 1.14-.41 1.74-.45h.05c.08-.01.17-.01.25-.01c.5-.01.97.06 1.44.2l.06.02c.1.02.17.06.25.06c.05.04.11.06.16.08l.14.06c.07.03.14.06.2.09c.03.02.06.03.09.05c.07.04.16.07.2.11c.04.02.08.05.12.07c.73.45 1.34 1.07 1.75 1.81c-.53-.37-1.49-.74-2.41-.58c3.6 1.81 2.63 8-2.36 7.76c-.44-.01-.88-.1-1.3-.25c-.1-.03-.2-.07-.29-.12c-.05-.02-.12-.05-.17-.08c-1.23-.63-2.24-1.82-2.38-3.27c0 0 .5-1.73 3.33-1.73c.31 0 1.17-.86 1.2-1.1c0-.09-1.74-.78-2.42-1.45c-.37-.36-.54-.53-.69-.66c-.08-.07-.17-.13-.26-.19a4.63 4.63 0 0 1-.03-2.45C7.6 6.12 6.8 6.86 6.22 7.5c-.4-.5-.37-2.15-.35-2.5c-.01 0-.3.16-.33.18c-.35.25-.68.53-.98.82c-.35.37-.66.74-.94 1.14c-.62.91-1.12 1.95-1.34 3.04c0 .01-.1.41-.17.92l-.03.23c-.02.17-.04.32-.08.58v.41c0 5.53 4.5 10.01 10 10.01c4.97 0 9.08-3.59 9.88-8.33c.02-.11.03-.24.05-.37c.2-1.72-.02-3.52-.65-5.03"/>
  </svg>
);

// Custom Safari icon component
const SafariIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0m-.004.953h.006c.063 0 .113.05.113.113v1.842c0 .063-.05.113-.113.113h-.006a.11.11 0 0 1-.113-.113V1.066c0-.063.05-.113.113-.113m-.941.041a.115.115 0 0 1 .11.104l.077.918a.11.11 0 0 1-.101.12h-.01a.11.11 0 0 1-.12-.1l-.08-.919a.11.11 0 0 1 .102-.12h.01zm1.892 0h.018a.113.113 0 0 1 .103.121l-.08.92a.11.11 0 0 1-.12.102h-.009a.11.11 0 0 1-.101-.121l.078-.92a.11.11 0 0 1 .111-.102m-2.838.123a.11.11 0 0 1 .106.092l.32 1.818c.01.06-.03.119-.09.13l-.01.001a.11.11 0 0 1-.128-.09l-.32-1.818a.11.11 0 0 1 .09-.129l.01-.002zm3.784.002h.021l.008.002c.061.01.102.07.092.131l-.32 1.814a.11.11 0 0 1-.132.09h-.005a.113.113 0 0 1-.092-.13l.32-1.815a.11.11 0 0 1 .108-.092m-4.715.203c.048.002.09.035.103.084l.239.893a.11.11 0 0 1-.079.139l-.005.001a.114.114 0 0 1-.14-.08l-.237-.894a.11.11 0 0 1 .078-.137l.006-.002a.1.1 0 0 1 .035-.004m5.644 0a.1.1 0 0 1 .033.004l.006.002c.06.016.097.079.08.139l-.24.892a.11.11 0 0 1-.137.08l-.005-.002a.114.114 0 0 1-.08-.138l.24-.893a.11.11 0 0 1 .103-.084m-6.562.285a.11.11 0 0 1 .107.073L9 3.42a.107.107 0 0 1-.064.139l-.012.005a.11.11 0 0 1-.14-.066L8.15 1.76a.11.11 0 0 1 .065-.14l.014-.005a.1.1 0 0 1 .03-.008zm7.469.002q.021 0 .042.006l.012.006c.057.02.087.082.067.139l-.633 1.738a.11.11 0 0 1-.14.066l-.013-.003A.11.11 0 0 1 15 3.42l.633-1.738a.11.11 0 0 1 .096-.073m-8.352.366a.11.11 0 0 1 .105.064l.393.838a.11.11 0 0 1-.055.148l-.008.004a.11.11 0 0 1-.146-.054l-.395-.838a.11.11 0 0 1 .055-.149l.008-.004a.1.1 0 0 1 .043-.01zm9.246 0a.1.1 0 0 1 .043.01l.006.003a.11.11 0 0 1 .053.149l-.391.838a.11.11 0 0 1-.148.054l-.006-.002a.11.11 0 0 1-.055-.148l.393-.84a.11.11 0 0 1 .105-.064m-10.092.44c.04-.002.08.018.102.056l.922 1.597a.113.113 0 0 1-.041.155l-.006.002a.113.113 0 0 1-.154-.041l-.922-1.598a.113.113 0 0 1 .04-.154l.007-.002a.1.1 0 0 1 .052-.016zm10.94.001a.1.1 0 0 1 .052.014l.004.002a.114.114 0 0 1 .041.156l-.923 1.596a.114.114 0 0 1-.157.04l-.004-.001a.11.11 0 0 1-.04-.155l.925-1.595a.11.11 0 0 1 .102-.057M5.729 2.93a.11.11 0 0 1 .093.047l.532.753a.114.114 0 0 1-.028.159l-.004.002a.114.114 0 0 1-.158-.028l-.531-.752a.114.114 0 0 1 .027-.158l.006-.002a.1.1 0 0 1 .063-.021m12.542 0a.1.1 0 0 1 .063.02l.006.003a.11.11 0 0 1 .027.156l-.531.756a.11.11 0 0 1-.156.028l-.006-.004a.11.11 0 0 1-.028-.157l.532-.755a.11.11 0 0 1 .093-.047m.747.578a.1.1 0 0 1 .08.027l.006.004c.047.04.053.111.013.158L17.932 5.11a.11.11 0 0 1-.157.016l-.005-.006a.11.11 0 0 1-.014-.156l1.185-1.414a.1.1 0 0 1 .077-.041zM4.984 3.51a.1.1 0 0 1 .077.039L6.244 4.96a.11.11 0 0 1-.014.158l-.003.004a.11.11 0 0 1-.159-.014L4.883 3.697a.11.11 0 0 1 .013-.158l.006-.004a.1.1 0 0 1 .082-.025m-.714.64q.042 0 .076.032l.658.66a.107.107 0 0 1 0 .152l-.01.01a.107.107 0 0 1-.152 0l-.66-.658a.11.11 0 0 1 0-.155l.01-.01a.1.1 0 0 1 .078-.03zm15.462 0q.043 0 .077.032l.007.007a.11.11 0 0 1 0 .155l-.658.66a.11.11 0 0 1-.154 0l-.008-.008a.11.11 0 0 1 0-.154l.658-.66a.1.1 0 0 1 .078-.032m.707.66c.038 0 .071.02.092.075a.11.11 0 0 1-.023.117l-7.606 8.08c-3.084 2.024-6.149 4.04-9.222 6.05c-.078.051-.17.082-.211-.028a.11.11 0 0 1 .023-.118l7.594-8.08a8381 8381 0 0 1 9.234-6.049a.25.25 0 0 1 .12-.046zm-16.824.045a.1.1 0 0 1 .08.026l1.416 1.187a.11.11 0 0 1 .014.157l-.006.005a.11.11 0 0 1-.156.014L3.549 5.057a.11.11 0 0 1-.014-.155l.006-.007a.1.1 0 0 1 .074-.04m17.336.756c.036 0 .072.017.094.05l.004.003a.114.114 0 0 1-.028.158l-.753.53a.11.11 0 0 1-.157-.028l-.004-.004a.114.114 0 0 1 .028-.158l.754-.53a.1.1 0 0 1 .062-.02zm-17.904.002q.031 0 .06.02l.76.531c.05.035.06.103.026.152l-.006.01a.11.11 0 0 1-.153.026l-.76-.532a.11.11 0 0 1-.025-.152l.006-.01a.11.11 0 0 1 .092-.045m-.512.803q.027 0 .053.016l1.596.923a.11.11 0 0 1 .04.153l-.003.006a.11.11 0 0 1-.153.04L2.473 6.63a.11.11 0 0 1-.041-.152l.004-.006a.11.11 0 0 1 .1-.055zm18.932 0a.11.11 0 0 1 .1.055l.001.004a.113.113 0 0 1-.04.154l-1.596.926a.113.113 0 0 1-.155-.041l-.002-.004a.113.113 0 0 1 .041-.155l1.596-.925a.1.1 0 0 1 .055-.014m-19.373.846q.021 0 .043.01l.838.392a.11.11 0 0 1 .052.147l-.004.01a.11.11 0 0 1-.146.052l-.838-.393a.11.11 0 0 1-.053-.146l.004-.01a.11.11 0 0 1 .104-.062m19.81.002a.11.11 0 0 1 .106.062l.002.008a.11.11 0 0 1-.053.146l-.838.393a.11.11 0 0 1-.146-.053l-.004-.008a.11.11 0 0 1 .052-.146l.838-.393a.1.1 0 0 1 .043-.01zm-20.183.88q.02 0 .043.006l1.732.631a.11.11 0 0 1 .067.145l-.002.006a.11.11 0 0 1-.143.066l-1.732-.63a.113.113 0 0 1-.069-.145l.002-.004a.12.12 0 0 1 .102-.074zm20.549 0a.11.11 0 0 1 .11.075l.003.004a.115.115 0 0 1-.069.146l-1.732.629a.11.11 0 0 1-.145-.066l-.001-.006a.113.113 0 0 1 .068-.145l1.732-.63a.1.1 0 0 1 .034-.006zm-20.836.909a.1.1 0 0 1 .033.004l.892.24c.06.016.096.077.08.137l-.002.007a.11.11 0 0 1-.136.079l-.895-.239a.113.113 0 0 1-.078-.138l.002-.006a.11.11 0 0 1 .104-.084m21.13.002a.115.115 0 0 1 .106.084v.004a.11.11 0 0 1-.078.138l-.893.239a.11.11 0 0 1-.138-.079v-.005a.11.11 0 0 1 .078-.14l.892-.237a.1.1 0 0 1 .033-.004m-21.335.93l.023.001l1.814.323a.11.11 0 0 1 .09.13v.006a.11.11 0 0 1-.13.09l-1.815-.322a.113.113 0 0 1-.092-.131l.002-.006a.11.11 0 0 1 .108-.092zm21.519.001h.022c.052.002.1.038.109.092v.006c.01.062-.03.12-.092.13l-1.814.321a.113.113 0 0 1-.131-.092v-.005a.113.113 0 0 1 .092-.131zm-21.644.944h.011l.922.084a.11.11 0 0 1 .102.119l-.002.01a.11.11 0 0 1-.121.1l-.922-.083a.11.11 0 0 1-.1-.12v-.009a.11.11 0 0 1 .11-.101m21.779.002h.012a.11.11 0 0 1 .11.101v.008a.11.11 0 0 1-.1.121l-.923.08a.11.11 0 0 1-.12-.101v-.008a.11.11 0 0 1 .1-.121l.92-.08zm-11.82.73L6.091 16.95c2.02-1.324 4.039-2.646 6.066-3.976l-1.095-1.31zm11.87.219c.063 0 .114.05.114.113v.004c0 .063-.05.113-.113.113l-1.844.004a.113.113 0 0 1-.113-.113v-.004c0-.063.05-.113.113-.113zm-21.869.002h1.844c.062 0 .112.05.112.111v.008c0 .062-.05.111-.112.111H1.064a.11.11 0 0 1-.11-.111v-.008a.11.11 0 0 1 .11-.111m.952.875h.011a.11.11 0 0 1 .11.101v.006a.11.11 0 0 1-.102.121l-.922.08a.11.11 0 0 1-.119-.101l-.002-.006a.11.11 0 0 1 .102-.121zm19.955 0h.011l.922.08a.11.11 0 0 1 .102.119v.008a.11.11 0 0 1-.121.101l-.922-.08a.11.11 0 0 1-.102-.119v-.008a.11.11 0 0 1 .11-.101m-18.924.705c.053.001.098.04.107.094l.002.004a.11.11 0 0 1-.092.13l-1.812.32a.113.113 0 0 1-.13-.091v-.004a.115.115 0 0 1 .09-.133l1.811-.318zm17.902 0l.024.002l1.816.32c.061.011.1.07.09.131v.004a.113.113 0 0 1-.131.092l-1.816-.32a.11.11 0 0 1-.09-.131v-.004a.11.11 0 0 1 .107-.094M2.332 14.477a.11.11 0 0 1 .104.082l.002.005a.11.11 0 0 1-.08.137l-.891.24a.11.11 0 0 1-.137-.08l-.002-.006a.11.11 0 0 1 .08-.136l.89-.239a.1.1 0 0 1 .034-.003m19.332 0q.018 0 .035.003l.893.239c.06.016.096.077.08.136l-.002.006a.11.11 0 0 1-.137.078l-.894-.238a.11.11 0 0 1-.078-.137l.002-.005a.11.11 0 0 1 .101-.082m-18.213.517a.11.11 0 0 1 .11.074l.002.004a.11.11 0 0 1-.067.145l-1.732.63a.113.113 0 0 1-.145-.068l-.002-.004a.113.113 0 0 1 .069-.144L3.418 15a.1.1 0 0 1 .033-.006m17.086 0q.022-.002.043.006l1.734.63a.11.11 0 0 1 .067.143l-.002.008a.11.11 0 0 1-.143.067l-1.734-.631a.11.11 0 0 1-.066-.143l.002-.008a.11.11 0 0 1 .1-.072zM2.92 16.117a.11.11 0 0 1 .103.063l.004.01a.11.11 0 0 1-.052.144l-.838.393a.11.11 0 0 1-.147-.055l-.004-.008a.11.11 0 0 1 .053-.146l.838-.391a.1.1 0 0 1 .043-.01m18.158 0a.1.1 0 0 1 .043.01l.838.39c.056.027.08.093.055.149l-.002.004a.11.11 0 0 1-.149.055l-.838-.391a.11.11 0 0 1-.054-.148l.002-.004a.11.11 0 0 1 .105-.065m-16.957.315c.04-.001.078.02.1.056l.004.004a.11.11 0 0 1-.041.153l-1.596.921a.113.113 0 0 1-.154-.04l-.002-.005a.113.113 0 0 1 .04-.154l1.596-.922a.1.1 0 0 1 .053-.013m15.756 0q.027 0 .053.013l1.597.924a.11.11 0 0 1 .041.152l-.002.004a.11.11 0 0 1-.152.041l-1.598-.921a.113.113 0 0 1-.04-.155l.001-.002a.11.11 0 0 1 .1-.056m.328 1.193a.1.1 0 0 1 .06.021l.758.534c.05.035.061.102.026.152l-.004.008a.11.11 0 0 1-.154.027l-.756-.535a.11.11 0 0 1-.028-.152l.006-.008a.11.11 0 0 1 .092-.047m-16.412.002c.035 0 .072.016.094.047l.004.008a.11.11 0 0 1-.028.152l-.756.531a.11.11 0 0 1-.152-.025l-.006-.008a.11.11 0 0 1 .028-.152l.755-.534a.1.1 0 0 1 .061-.019m15.162.102a.1.1 0 0 1 .082.025l1.414 1.187a.11.11 0 0 1 .014.157l-.004.004a.113.113 0 0 1-.158.013L18.89 17.93a.11.11 0 0 1-.014-.157l.004-.005a.1.1 0 0 1 .074-.04zm-12.812 1.12a.1.1 0 0 1 .08.026l.007.008a.11.11 0 0 1 .014.154L5.06 20.451a.11.11 0 0 1-.155.012l-.008-.006a.11.11 0 0 1-.013-.154l1.185-1.414a.1.1 0 0 1 .075-.04zm11.703 0c.032 0 .065.015.088.042l1.181 1.41c.04.048.035.12-.013.16l-.002.002a.114.114 0 0 1-.16-.014l-1.182-1.41a.114.114 0 0 1 .013-.16l.002-.002a.12.12 0 0 1 .073-.027zm-12.928.114q.042 0 .074.031l.014.012a.107.107 0 0 1 0 .15l-.662.66a.105.105 0 0 1-.149 0l-.011-.011a.105.105 0 0 1 0-.149l.66-.662a.1.1 0 0 1 .074-.031m14.164 0q.041 0 .074.031l.66.662a.106.106 0 0 1 0 .15l-.011.012a.106.106 0 0 1-.15-.002l-.66-.66a.106.106 0 0 1 .001-.15l.01-.012a.1.1 0 0 1 .076-.031m-11.627.797a.1.1 0 0 1 .05.015l.007.004a.11.11 0 0 1 .04.15l-.921 1.598a.11.11 0 0 1-.15.041l-.008-.004a.11.11 0 0 1-.04-.152l.922-1.596a.11.11 0 0 1 .1-.056m9.088.002a.11.11 0 0 1 .1.054l.925 1.596a.113.113 0 0 1-.04.154h-.005a.11.11 0 0 1-.152-.039l-.926-1.595a.113.113 0 0 1 .041-.155l.004-.002a.1.1 0 0 1 .053-.013m-10.285.324q.032 0 .062.021l.004.002a.113.113 0 0 1 .028.157l-.53.755a.11.11 0 0 1-.156.028l-.004-.002a.11.11 0 0 1-.027-.156l.53-.756a.11.11 0 0 1 .093-.05zm11.484.002c.036 0 .072.015.094.047l.53.756c.035.05.023.12-.028.156l-.004.002a.11.11 0 0 1-.156-.028l-.53-.755a.11.11 0 0 1 .028-.157l.004-.002a.1.1 0 0 1 .062-.02zm-8.863.342a.1.1 0 0 1 .043.006l.012.005c.056.02.084.081.064.137l-.633 1.74a.105.105 0 0 1-.136.063l-.014-.004a.106.106 0 0 1-.065-.137l.633-1.74a.11.11 0 0 1 .096-.07m6.232 0a.11.11 0 0 1 .106.07l.633 1.738a.107.107 0 0 1-.065.137l-.015.006a.107.107 0 0 1-.137-.065L15 20.578a.107.107 0 0 1 .064-.137l.014-.005a.1.1 0 0 1 .033-.006m-4.695.41q.011 0 .021.002l.006.002c.062.01.101.067.09.129l-.318 1.812a.113.113 0 0 1-.131.092l-.004-.002a.11.11 0 0 1-.092-.129l.32-1.812a.11.11 0 0 1 .108-.094m3.146.002h.022a.11.11 0 0 1 .107.092l.32 1.812a.11.11 0 0 1-.091.131l-.004.002a.113.113 0 0 1-.13-.092l-.321-1.812a.113.113 0 0 1 .092-.131zm-5.79.119a.1.1 0 0 1 .042.01l.004.002a.114.114 0 0 1 .055.15l-.393.834a.11.11 0 0 1-.148.055l-.004-.002a.11.11 0 0 1-.055-.149l.393-.836a.11.11 0 0 1 .105-.064zm8.458 0a.11.11 0 0 1 .104.062l.39.84a.11.11 0 0 1-.052.147l-.008.004a.11.11 0 0 1-.146-.055l-.391-.838a.11.11 0 0 1 .053-.146l.008-.004a.1.1 0 0 1 .042-.01m-4.236.018H12c.063 0 .115.05.115.113l.002 1.84c0 .063-.05.113-.113.113h-.006a.113.113 0 0 1-.113-.113l-.004-1.838c0-.063.05-.115.113-.115m-2.592.578q.016-.001.034.004l.005.002a.11.11 0 0 1 .079.136l-.24.893a.11.11 0 0 1-.137.078l-.006-.002a.11.11 0 0 1-.078-.137l.24-.89a.11.11 0 0 1 .103-.084m5.196.002a.11.11 0 0 1 .103.082l.24.89a.11.11 0 0 1-.078.137l-.006.002a.11.11 0 0 1-.136-.078l-.24-.89a.11.11 0 0 1 .078-.138l.005-.002a.1.1 0 0 1 .034-.003m-3.475.302h.01l.008.002c.061.006.107.06.101.121l-.08.92a.11.11 0 0 1-.121.102h-.008a.11.11 0 0 1-.1-.121l.08-.922a.11.11 0 0 1 .11-.102m1.736 0h.02a.11.11 0 0 1 .107.102l.08.924a.11.11 0 0 1-.101.119l-.008.002a.11.11 0 0 1-.12-.102l-.08-.924a.11.11 0 0 1 .102-.12z"/>
  </svg>
);

// Custom Edge icon component
const EdgeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <g fill="none"><path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"/><path fill="currentColor" d="M10.184 11.77c.029 1.06.603 2.334 1.956 3.462C13.317 16.212 15.353 17 17 17a7 7 0 0 0 1.669-.2a1 1 0 0 1 1.004 1.613a10 10 0 0 1-6.34 3.499a.8.8 0 0 1-.31-.014C10.884 21.37 8.5 18.688 8.5 16c0-2.374.84-3.645 1.684-4.23m-.706-3.731a3.58 3.58 0 0 1 2.18 1.234a5.2 5.2 0 0 0-1.474.278C8.177 10.221 6.5 12.388 6.5 16c0 2.537 1.199 4.266 2.771 5.623c-3.987-1.129-6.962-4.667-7.248-8.944a.9.9 0 0 1 .21-.642l.17-.196l.324-.358l.267-.281l.149-.154l.332-.333l.378-.369l.208-.197c1.91-1.803 3.9-2.368 5.417-2.11M12 2c4.76 0 8.742 3.325 9.752 7.779c.36 1.585-.113 2.825-.827 3.688a5.03 5.03 0 0 1-2.09 1.476c-.965.341-2.05.327-2.912.176c-.77-.135-1.73-.395-2.203-1.072a1 1 0 0 1 .109-1.277c.485-.49.709-.995.742-1.447a2 2 0 0 0-.045-.54c-.582-2.62-2.386-4.321-4.713-4.716c-2.76-.469-5.379.957-7.315 2.808C3.81 4.883 7.568 2 12 2"/></g>
  </svg>
);

export function HeaderNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [extensionsOpen, setExtensionsOpen] = useState(false);
  const { isSignedIn, user } = useUser();

  // Check if user is admin
  const isAdmin = user?.primaryEmailAddress?.emailAddress === "isaiah.e.malone@gmail.com";

  // Filter navigation items based on sign-in status
  const allNavItems = [
    {
      label: "Filtr",
      href: "/filtr",
      icon: JobFiltrLogo,
      description: "Scan job postings for scams",
      requiresAuth: false,
    },
    {
      label: "Job Database",
      href: "/job-database",
      icon: DatabaseSearchIcon,
      description: "Browse verified jobs",
      requiresAuth: false,
    },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "View your analytics",
      requiresAuth: true,
    },
  ];

  const mainNavItems = allNavItems.filter(
    (item) => !item.requiresAuth || isSignedIn
  );

  const extensions = [
    {
      name: "Chrome",
      icon: Chrome,
      status: "Available",
      downloadUrl: "/chrome-extension.zip",
      installGuide: "/extension-install-guide",
    },
    {
      name: "Firefox",
      icon: FirefoxIcon,
      status: "Coming Soon",
      downloadUrl: "#",
      installGuide: "#",
    },
    {
      name: "Safari",
      icon: SafariIcon,
      status: "Coming Soon",
      downloadUrl: "#",
      installGuide: "#",
    },
    {
      name: "Edge",
      icon: EdgeIcon,
      status: "Coming Soon",
      downloadUrl: "#",
      installGuide: "#",
    },
  ];

  const handleExtensionClick = (extension: typeof extensions[0]) => {
    // Navigate to homepage if not already there
    if (window.location.pathname !== "/") {
      // Store the selected browser in sessionStorage
      sessionStorage.setItem("selectedBrowser", extension.name.toLowerCase());
      window.location.href = "/#extension";
      return;
    }

    // If on homepage, scroll to extension section with selected browser
    const extensionSection = document.getElementById("extension");
    if (extensionSection) {
      // Set the browser before scrolling
      const event = new CustomEvent("selectBrowser", {
        detail: { browser: extension.name.toLowerCase() },
      });
      window.dispatchEvent(event);

      // Scroll to section
      const offset = 80;
      const elementPosition = extensionSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <nav className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <JobFiltrLogo className="h-8 w-8 transition-transform group-hover:scale-110" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-rose-300">
              JobFiltr
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Main Nav Items */}
            <div className="flex items-center gap-6">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isFiltrIcon = item.label === "Filtr";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {isFiltrIcon ? (
                      <Icon className="h-4 w-4 transition-transform group-hover:scale-110" variant="outline" />
                    ) : (
                      <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                    )}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Extensions Dropdown */}
            <div className="relative">
              <button
                onClick={() => setExtensionsOpen(!extensionsOpen)}
                onBlur={() => setTimeout(() => setExtensionsOpen(false), 200)}
                className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Extensions</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    extensionsOpen && "rotate-180"
                  )}
                />
              </button>

              <AnimatePresence>
                {extensionsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden"
                  >
                    <div className="p-3 border-b border-white/10">
                      <p className="text-xs text-white/50 font-medium">
                        BROWSER EXTENSIONS
                      </p>
                    </div>
                    {extensions.map((ext) => {
                      const ExtIcon = ext.icon;
                      return (
                        <button
                          key={ext.name}
                          onClick={() => handleExtensionClick(ext)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left",
                            ext.status === "Coming Soon" &&
                              "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <ExtIcon className="h-5 w-5 text-white/70" />
                            <div>
                              <p className="text-sm text-white font-medium">
                                {ext.name}
                              </p>
                              <p className="text-xs text-white/50">
                                {ext.status}
                              </p>
                            </div>
                          </div>
                          {ext.status === "Available" && (
                            <Download className="h-4 w-4 text-indigo-400" />
                          )}
                        </button>
                      );
                    })}
                    <div className="p-3 border-t border-white/10 bg-white/5">
                      <p className="text-xs text-white/50 text-center">
                        More browsers coming soon
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Contact */}
            <Link
              href="/contact"
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Contact</span>
            </Link>

            {/* Admin - Only visible for admin user */}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
              >
                <AdminIcon className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            )}

            {/* Auth */}
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-white/10">
              {isSignedIn ? (
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8",
                    },
                  }}
                />
              ) : (
                <>
                  <SignInButton mode="modal">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/70 hover:text-white hover:bg-white/5"
                    >
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                    >
                      Sign Up
                    </Button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-white/70 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden border-t border-white/10"
            >
              <div className="py-4 space-y-4">
                {/* Main Nav Items */}
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const isFiltrIcon = item.label === "Filtr";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      {isFiltrIcon ? (
                        <Icon className="h-5 w-5 text-white/70" variant="outline" />
                      ) : (
                        <Icon className="h-5 w-5 text-white/70" />
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">
                          {item.label}
                        </p>
                        <p className="text-white/50 text-xs">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}

                {/* Extensions */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-white/50 font-medium mb-3 px-3">
                    BROWSER EXTENSIONS
                  </p>
                  {extensions.map((ext) => {
                    const ExtIcon = ext.icon;
                    return (
                      <button
                        key={ext.name}
                        onClick={() => {
                          handleExtensionClick(ext);
                          setMobileMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors",
                          ext.status === "Coming Soon" &&
                            "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <ExtIcon className="h-5 w-5 text-white/70" />
                          <div className="text-left">
                            <p className="text-sm text-white font-medium">
                              {ext.name}
                            </p>
                            <p className="text-xs text-white/50">
                              {ext.status}
                            </p>
                          </div>
                        </div>
                        {ext.status === "Available" && (
                          <Download className="h-4 w-4 text-indigo-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Contact */}
                <Link
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors border-t border-white/10 pt-4"
                >
                  <MessageSquare className="h-5 w-5 text-white/70" />
                  <div>
                    <p className="text-white text-sm font-medium">Contact</p>
                    <p className="text-white/50 text-xs">
                      Feedback & Support
                    </p>
                  </div>
                </Link>

                {/* Admin - Only visible for admin user */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <AdminIcon className="h-5 w-5 text-white/70" />
                    <div>
                      <p className="text-white text-sm font-medium">Admin</p>
                      <p className="text-white/50 text-xs">
                        Admin Dashboard
                      </p>
                    </div>
                  </Link>
                )}

                {/* Auth */}
                <div className="pt-4 border-t border-white/10">
                  {isSignedIn ? (
                    <div className="flex items-center gap-3 p-3">
                      <UserButton
                        appearance={{
                          elements: {
                            avatarBox: "h-8 w-8",
                          },
                        }}
                      />
                      <p className="text-white text-sm">Account</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <SignInButton mode="modal">
                        <Button
                          variant="outline"
                          className="w-full border-white/20 hover:bg-white/5 text-white"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Sign In
                        </Button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <Button
                          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Sign Up
                        </Button>
                      </SignUpButton>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
