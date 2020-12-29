import Ts from 'rollup-plugin-typescript2'

export default {
    input: [
        'src/index.ts',
        'src/Table/index.ts',

        'src/Modal/index.ts',
        'src/Modal/ConfirmModal.tsx',

        'src/DatePicker/index.ts',

        'src/Icon/index.ts',
        'src/Button/index.ts',
        'src/Select/index.ts',
        'src/SearchInput/index.ts',
        'src/SearchInput/index.ts',
        'src/TextInput/index.ts',
        'src/List/index.ts',
        'src/Typography/index.ts',
        'src/Typography/Heading.tsx',
        'src/Typography/Paragraph.tsx'
    ],
    output: {
        dir: 'lib',
        format: 'esm',
        sourcemap: true
    },
    plugins: [Ts({})],
    preserveModules: true,
    external: ['react', '@apollo/client', 'react-dom', '@headlessui/react']
}
