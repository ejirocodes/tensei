import React, { ReactNode } from 'react'

export interface TextInputProps {
    id: string
    name: string
    label: string
    className?: string
    placeholder?: string
    hiddenLabel?: boolean
    addonAfter?: ReactNode
}

const TextInput: React.FC<TextInputProps> = ({
    id,
    name,
    label,
    placeholder,
    hiddenLabel,
    className = ''
}) => {
    return (
        <div className={className}>
            {label && (
                <label
                    htmlFor={name}
                    className={
                        hiddenLabel
                            ? 'sr-only'
                            : 'text-tensei-darkest inline-block mb-2'
                    }
                >
                    {label}
                </label>
            )}
            <input
                id={id}
                name={name}
                placeholder={placeholder}
                className="rounded-md block w-full pr-10 pl-3 h-10 leading-5 bg-white focus:outline-none placeholder-tensei-gray-700 focus:ring-1 focus:ring-tensei-primary border border-tensei-gray-400 focus:border-tensei-primary sm:text-sm"
            />
        </div>
    )
}

export default TextInput
