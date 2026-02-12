import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    <div
            className = {
        twMerge(
            clsx('bg-white rounded-xl shadow-sm border p-4', borderColors[borderColor]),
        className
            )
        }
            {...props }
        >
    { children }
        </div >
    );
}
