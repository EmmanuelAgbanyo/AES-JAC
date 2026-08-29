import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportContractToDocx } from './exportService';
import { Packer, Document, Paragraph, HeadingLevel, AlignmentType } from 'docx';
import saveAs from 'file-saver';
import { ContractData } from '../types';

vi.mock('docx', () => {
    class MockDocument {
        constructor(public options: any) {}
    }
    class MockParagraph {
        constructor(public options: any) {}
    }
    class MockTextRun {
        constructor(public options: any) {}
    }
    class MockTable {
        constructor(public options: any) {}
    }
    class MockTableRow {
        constructor(public options: any) {}
    }
    class MockTableCell {
        constructor(public options: any) {}
    }

    // Create actual mock functions to track calls, but return class instances
    const docMock = vi.fn((opts) => new MockDocument(opts));
    const paraMock = vi.fn((opts) => new MockParagraph(opts));

    return {
        // Expose the mock functions under the expected class names, but make them constructable
        Document: new Proxy(MockDocument, {
            construct(target, args: any[]) {
                docMock(args[0]);
                return new target(args[0]);
            },
            get(target, prop) {
                return prop === 'mock' ? docMock.mock : Reflect.get(target, prop);
            }
        }),
        Paragraph: new Proxy(MockParagraph, {
            construct(target, args: any[]) {
                paraMock(args[0]);
                return new target(args[0]);
            },
            get(target, prop) {
                return prop === 'mock' ? paraMock.mock : Reflect.get(target, prop);
            }
        }),
        TextRun: MockTextRun,
        Table: MockTable,
        TableRow: MockTableRow,
        TableCell: MockTableCell,
        HeadingLevel: { HEADING_1: 'HEADING_1', HEADING_2: 'HEADING_2', HEADING_3: 'HEADING_3' },
        AlignmentType: { CENTER: 'CENTER' },
        WidthType: { PERCENTAGE: 'PERCENTAGE' },
        Packer: {
            toBlob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))
        },
        _docMock: docMock,
        _paraMock: paraMock
    }
});

vi.mock('file-saver', () => {
    return {
        default: vi.fn()
    }
});

// Import the internal mocks we exposed to check calls
// @ts-ignore
import { _docMock, _paraMock } from 'docx';

describe('exportContractToDocx', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        _docMock.mockClear();
        _paraMock.mockClear();
    });

    it('should generate docx with correct styles and structure', async () => {
        const contract: ContractData = {
            title: 'Service Agreement',
            clauses: [
                { title: 'Scope of Work', content: 'The contractor will provide...\nLine 2 content.' },
                { title: 'Payment Terms', content: 'Payment is due within 30 days...' }
            ],
        };
        const entrepreneurName = 'John Doe';

        await exportContractToDocx(contract, entrepreneurName);

        // 1. Check Document mock was called with correct styles and sections
        expect(_docMock).toHaveBeenCalledTimes(1);
        const docArgs = _docMock.mock.calls[0][0];

        // Styles validation
        expect(docArgs.styles.paragraphStyles).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: 'heading1', run: { size: 32, bold: true, color: "000000", font: "Calibri" } }),
                expect.objectContaining({ id: 'heading2', run: { size: 24, bold: true, color: "000000", font: "Calibri" } }),
                expect.objectContaining({ id: 'normal', run: { size: 22, font: "Calibri" } })
            ])
        );

        // Sections validation
        expect(docArgs.sections).toHaveLength(1);

        // Verify correct paragraphs were created
        expect(_paraMock).toHaveBeenCalledWith({ text: 'Service Agreement', heading: 'HEADING_1', alignment: 'CENTER' });
        expect(_paraMock).toHaveBeenCalledWith({ text: 'Scope of Work', heading: 'HEADING_2' });
        expect(_paraMock).toHaveBeenCalledWith({ text: 'The contractor will provide...', style: 'normal' });
        expect(_paraMock).toHaveBeenCalledWith({ text: 'Line 2 content.', style: 'normal' });
        expect(_paraMock).toHaveBeenCalledWith({ text: 'Payment Terms', heading: 'HEADING_2' });
        expect(_paraMock).toHaveBeenCalledWith({ text: 'Payment is due within 30 days...', style: 'normal' });

        // 2. Check Packer.toBlob
        expect(Packer.toBlob).toHaveBeenCalledTimes(1);

        // 3. Check saveAs
        expect(saveAs).toHaveBeenCalledTimes(1);
        expect(saveAs).toHaveBeenCalledWith(
            expect.any(Blob),
            'Service_Agreement_for_John_Doe.docx'
        );
    });

    it('should correctly format filename replacing spaces with underscores', async () => {
        const contract: ContractData = {
            title: '  My Custom Contract  ',
            clauses: [],
        };
        const entrepreneurName = 'Jane   Smith';

        await exportContractToDocx(contract, entrepreneurName);

        expect(saveAs).toHaveBeenCalledTimes(1);
        expect(saveAs).toHaveBeenCalledWith(
            expect.any(Blob),
            '__My_Custom_Contract___for_Jane___Smith.docx'
        );
    });

    it('should handle contracts with no clauses', async () => {
        const contract: ContractData = {
            title: 'Empty Contract',
            clauses: [],
        };
        const entrepreneurName = 'John';

        await exportContractToDocx(contract, entrepreneurName);

        // Should only have the title and a spacer
        const docArgs = _docMock.mock.calls[0][0];
        expect(docArgs.sections[0].children).toHaveLength(2); // Title + spacer

        expect(saveAs).toHaveBeenCalledTimes(1);
        expect(saveAs).toHaveBeenCalledWith(
            expect.any(Blob),
            'Empty_Contract_for_John.docx'
        );
    });
});
