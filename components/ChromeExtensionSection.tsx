"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Chrome, CheckCircle2, Zap, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

type BrowserType = "chrome" | "firefox" | "safari" | "edge";

interface BrowserTab {
  id: BrowserType;
  name: string;
  icon: typeof Chrome;
  color: string;
  available: boolean;
}

interface InstallStep {
  number: string;
  title: string;
  description: string;
  icon: typeof Download;
}

export function ChromeExtensionSection({ id }: { id?: string }) {
  const [selectedBrowser, setSelectedBrowser] = useState<BrowserType>("chrome");

  // Listen for browser selection events from header
  useEffect(() => {
    // Check sessionStorage on mount
    const storedBrowser = sessionStorage.getItem("selectedBrowser");
    if (storedBrowser) {
      setSelectedBrowser(storedBrowser as BrowserType);
      sessionStorage.removeItem("selectedBrowser");
    }

    // Listen for custom events
    const handleSelectBrowser = (event: CustomEvent) => {
      const browser = event.detail.browser as BrowserType;
      setSelectedBrowser(browser);
    };

    window.addEventListener("selectBrowser", handleSelectBrowser as EventListener);

    return () => {
      window.removeEventListener("selectBrowser", handleSelectBrowser as EventListener);
    };
  }, []);

  const browsers: BrowserTab[] = [
    {
      id: "chrome",
      name: "Chrome",
      icon: Chrome,
      color: "from-blue-500 to-cyan-500",
      available: true,
    },
    {
      id: "firefox",
      name: "Firefox",
      icon: FirefoxIcon,
      color: "from-orange-500 to-red-500",
      available: false,
    },
    {
      id: "safari",
      name: "Safari",
      icon: SafariIcon,
      color: "from-cyan-500 to-blue-500",
      available: false,
    },
    {
      id: "edge",
      name: "Edge",
      icon: EdgeIcon,
      color: "from-blue-600 to-cyan-600",
      available: false,
    },
  ];

  const browserContent: Record<BrowserType, {
    title: string;
    description: string;
    downloadUrl: string;
    steps: InstallStep[];
    instructions: string[];
  }> = {
    chrome: {
      title: "Add to Chrome",
      description: "Join thousands of job seekers protecting themselves from scams and ghost jobs",
      downloadUrl: "/jobfiltr-chrome-extension.zip",
      steps: [
        {
          number: "1",
          title: "Download",
          description: "Click the button to download the extension",
          icon: Download,
        },
        {
          number: "2",
          title: "Unzip",
          description: "Extract the downloaded ZIP file",
          icon: Chrome,
        },
        {
          number: "3",
          title: "Install",
          description: "Load the extension in Chrome",
          icon: CheckCircle2,
        },
      ],
      instructions: [
        "Download the extension ZIP file",
        "Unzip the downloaded file to a folder",
        "Open Chrome and go to chrome://extensions/",
        "Enable 'Developer mode' (toggle in top right)",
        "Click 'Load unpacked'",
        "Select the unzipped extension folder",
        "Pin the extension to your toolbar",
        "Start browsing job boards safely!",
      ],
    },
    firefox: {
      title: "Add to Firefox",
      description: "Coming soon! Firefox extension is in development",
      downloadUrl: "#",
      steps: [
        {
          number: "1",
          title: "Coming Soon",
          description: "Firefox extension in development",
          icon: Download,
        },
        {
          number: "2",
          title: "Get Notified",
          description: "Sign up to know when it's ready",
          icon: Chrome,
        },
        {
          number: "3",
          title: "Stay Tuned",
          description: "We'll notify you at launch",
          icon: CheckCircle2,
        },
      ],
      instructions: [
        "Firefox extension is currently in development",
        "Expected release: Q1 2025",
        "We're working on full Firefox compatibility",
        "Sign up to be notified when it launches",
        "In the meantime, try our web version",
      ],
    },
    safari: {
      title: "Add to Safari",
      description: "Coming soon! Safari extension is in development",
      downloadUrl: "#",
      steps: [
        {
          number: "1",
          title: "Coming Soon",
          description: "Safari extension in development",
          icon: Download,
        },
        {
          number: "2",
          title: "Get Notified",
          description: "Sign up to know when it's ready",
          icon: Chrome,
        },
        {
          number: "3",
          title: "Stay Tuned",
          description: "We'll notify you at launch",
          icon: CheckCircle2,
        },
      ],
      instructions: [
        "Safari extension is currently in development",
        "Expected release: Q2 2025",
        "We're adapting to Safari's Web Extension format",
        "Sign up to be notified when it launches",
        "In the meantime, try our web version",
      ],
    },
    edge: {
      title: "Add to Edge",
      description: "Coming soon! Edge extension is in development",
      downloadUrl: "#",
      steps: [
        {
          number: "1",
          title: "Coming Soon",
          description: "Edge extension in development",
          icon: Download,
        },
        {
          number: "2",
          title: "Get Notified",
          description: "Sign up to know when it's ready",
          icon: Chrome,
        },
        {
          number: "3",
          title: "Stay Tuned",
          description: "We'll notify you at launch",
          icon: CheckCircle2,
        },
      ],
      instructions: [
        "Edge extension is currently in development",
        "Expected release: Q1 2025",
        "Edge uses Chromium, so adaptation is quick",
        "Sign up to be notified when it launches",
        "In the meantime, try our web version",
      ],
    },
  };

  const currentBrowser = browserContent[selectedBrowser];
  const currentBrowserTab = browsers.find((b) => b.id === selectedBrowser)!;

  const handleDownload = () => {
    if (!currentBrowserTab.available) return;

    const link = document.createElement("a");
    link.href = currentBrowser.downloadUrl;
    link.download = `jobfiltr-${selectedBrowser}-extension.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show installation guide
    window.open("/extension-install-guide", "_blank");
  };

  const features = [
    {
      icon: Zap,
      title: "Instant Detection",
      description: "Real-time analysis as you browse",
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Your data stays on your device",
    },
    {
      icon: CheckCircle2,
      title: "Always Free",
      description: "No subscriptions, no hidden fees",
    },
  ];

  return (
    <div id={id} className="relative pt-12 pb-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent" />

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200">
            Get The Browser Extension
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Filter out scams and fake job postings while you browse
          </p>
        </motion.div>

        {/* Browser Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-4xl mx-auto mb-8"
        >
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {browsers.map((browser) => {
              const Icon = browser.icon;
              const isSelected = selectedBrowser === browser.id;

              return (
                <button
                  key={browser.id}
                  onClick={() => setSelectedBrowser(browser.id)}
                  className={cn(
                    "relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2",
                    isSelected
                      ? "bg-gradient-to-r " +
                          browser.color +
                          " text-white shadow-lg"
                      : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{browser.name}</span>
                  {!browser.available && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-xs rounded-full text-white">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Main CTA Card with Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedBrowser}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto mb-20"
          >
            <Card className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-rose-500/10 border-white/10 backdrop-blur-sm">
              <CardContent className="p-8 md:p-12">
                {/* Browser Icon and Title */}
                <div className="text-center mb-8">
                  <div
                    className={cn(
                      "inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 bg-gradient-to-br",
                      currentBrowserTab.color
                    )}
                  >
                    <currentBrowserTab.icon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {currentBrowser.title} - It&apos;s Free!
                  </h3>
                  <p className="text-white/60 max-w-xl mx-auto">
                    {currentBrowser.description}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                  <Button
                    size="lg"
                    disabled={!currentBrowserTab.available}
                    onClick={handleDownload}
                    className={cn(
                      "px-8 py-6 text-lg font-semibold shadow-lg",
                      currentBrowserTab.available
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                    )}
                  >
                    <Download className="mr-2 h-5 w-5" />
                    {currentBrowserTab.available
                      ? `Download for ${currentBrowserTab.name}`
                      : "Coming Soon"}
                  </Button>
                  <Link href="/filtr">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/20 hover:bg-white/5 text-white px-8 py-6 text-lg"
                    >
                      Try Web Version
                    </Button>
                  </Link>
                </div>

                {/* Installation Instructions */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400" />
                    Installation Instructions
                  </h4>
                  <ol className="space-y-2">
                    {currentBrowser.instructions.map((instruction, index) => (
                      <li
                        key={index}
                        className="flex gap-3 text-white/70 text-sm"
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                          {index + 1}
                        </span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
