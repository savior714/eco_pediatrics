'use client';

import React, { Component, ReactNode } from 'react';
import { toaster } from './Toast';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    context?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * 컴포넌트 레벨 에러 경계.
 * - 자식 컴포넌트 렌더링 중 발생한 예외를 포착하여 앱 전체 크래시를 방지
 * - 에러 발생 시 Toast 알림 표시 후 fallback UI 렌더링
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error): void {
        const context = this.props.context ? `[${this.props.context}] ` : '';
        toaster.create({
            type: 'error',
            title: `${context}오류 발생`,
            description: error.message || '알 수 없는 오류가 발생했습니다.',
        });
        console.error(`[ErrorBoundary${this.props.context ? `:${this.props.context}` : ''}]`, error);
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
                    <p className="text-sm font-semibold text-red-500">
                        {this.props.context ? `${this.props.context} 영역에서 ` : ''}오류가 발생했습니다.
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    >
                        다시 시도
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
