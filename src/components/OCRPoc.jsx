import React, { useState, useEffect } from 'react';
import {
    Upload, X, FileText, CheckCircle, Download,
    Loader2, ChevronRight, Plus, AlertCircle, Trash2,
    FileImage, FileType, Check, Lightbulb, Play,
    CreditCard, Building2, Contact2, Landmark, FileText as Receipt,
    ChevronDown, ChevronLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { callGeminiVision } from '../services/aiService';

const OCRPoc = ({ onBack }) => {
    // 1. State Management
    const [step, setStep] = useState(1);
    const [files, setFiles] = useState([]);
    const [docType, setDocType] = useState('영수증');
    const [isDocTypeOpen, setIsDocTypeOpen] = useState(false);
    const [tags, setTags] = useState([]);
    const [customTag, setCustomTag] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState([]);
    const [showToast, setShowToast] = useState(false);
    const [warning, setWarning] = useState(null);

    // 2. Preset Tags Mapping
    const PRESET_TAGS = {
        '영수증': ['상호명', '일자', '합계 금액', '부가세', '승인번호'],
        '사업자등록증': ['등록번호', '대표자명', '법인명', '주소', '업태'],
        '주민등록증/운전면허증': ['이름', '주민번호', '주소', '발행일', '기관'],
        '명함': ['이름', '직위', '회사명', '연락처', '이메일'],
        '통장사본': ['은행명', '계좌번호', '예금주', '지점명']
    };

    const getDocIcon = (type) => {
        switch (type) {
            case '영수증': return Receipt;
            case '사업자등록증': return Building2;
            case '주민등록증/운전면허증': return CreditCard;
            case '명함': return Contact2;
            case '통장사본': return Landmark;
            default: return FileText;
        }
    };

    // Update tags when docType changes
    useEffect(() => {
        setTags(PRESET_TAGS[docType] || []);
    }, [docType]);

    // 3. Handlers
    const handleFileUpload = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (files.length + selectedFiles.length > 20) {
            setWarning('최대 20개까지만 업로드 가능합니다.');
            return;
        }

        const newFiles = selectedFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: (file.size / 1024).toFixed(1) + 'KB',
            type: file.type.split('/')[1].toUpperCase(),
            rawFile: file // 실제 분석을 위해 파일 객체 저장
        }));
        setFiles([...files, ...newFiles]);
    };

    const removeFile = (id) => {
        setFiles(files.filter(f => f.id !== id));
    };

    const handleAddTag = (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            if (customTag.trim() && !tags.includes(customTag.trim())) {
                setTags([...tags, customTag.trim()]);
                setCustomTag('');
            }
        }
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const startConversion = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        try {
            const newResults = [];

            for (const file of files) {
                // 1. 이미지를 Base64로 변환
                const base64Data = await fileToBase64(file.rawFile);

                // 2. 프롬프트 생성 (선택된 태그 기반)
                const prompt = `이 문서는 ${docType}입니다. 다음 항목들의 내용을 정확히 추출해서 JSON으로 리턴해주세요: ${tags.join(', ')}. 만약 이미지에서 내용을 찾을 수 없다면 해당 항목의 값은 ""으로 표시하세요.`;

                // 3. 실제 Gemini Vision API 호출
                const extractedData = await callGeminiVision(prompt, base64Data, file.rawFile.type);

                newResults.push({
                    id: file.id,
                    name: file.name,
                    date: new Date().toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }),
                    status: '완료',
                    docType: docType,
                    extractedData: [extractedData] // xlsx 포맷(배열 내 객체) 유지
                });
            }

            setResults([...newResults, ...results]);
            setStep(1);
            setFiles([]);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
            console.error('[OCR 실전 변환 오류]', error);
            alert(`변환 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadExcel = (result) => {
        const ws = XLSX.utils.json_to_sheet(result.extractedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "OCR_Result");

        // Finalize filename
        const fileName = `${result.name.split('.')[0]}_추출결과.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    // 6. Delete Result
    const handleDeleteResult = (id) => {
        setResults(prevResults => prevResults.filter(res => res.id !== id));
    };

    return (
        <div className="flex-1 bg-white overflow-y-auto">
            <main className="w-full py-12 px-0">

                {/* Tool Header Section */}
                <div className="mb-10 px-10">
                    <div className="flex items-center space-x-4 mb-5">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm transition-all active:scale-95"
                            title="에이전트 목록으로 돌아가기"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">📄 텍스트 추출 도구</h1>
                    </div>
                    <div className="text-gray-500 text-sm leading-relaxed w-full space-y-1 font-medium">
                        <p>이미지에서 글자를 자동으로 뽑아주는 도구입니다. 사용자가 이미지 파일을 올리고 이미지 안에서 뽑아낼 정보만 알려주면 자동으로 엑셀 파일로 정리해 내려줍니다.</p>
                        <p>이 도구를 쓰면 거래처에서 받은 사업자등록증 정보를 자동으로 뽑거나, 사원들의 영수증 사용내역도 빠르게 정리할 수 있어요. 스크린샷이나 스캔본은 물론, 손으로 쓴 내용도 사진으로 찍어 올리시면 정리해 드립니다.</p>
                    </div>
                </div>

                {/* Simple Stepper */}
                <div className="flex items-center space-x-10 mb-10 px-10">
                    <button
                        onClick={() => setStep(1)}
                        className={`flex items-center space-x-2.5 transition-all hover:opacity-70 active:scale-95 ${step === 1 ? 'text-gray-900' : 'text-gray-400'}`}
                    >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-bold shadow-sm transition-colors ${step >= 1 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                        <span className="text-sm font-bold">이미지 파일 업로드</span>
                    </button>
                    <button
                        onClick={() => files.length > 0 && setStep(2)}
                        disabled={files.length === 0}
                        className={`flex items-center space-x-2.5 transition-all ${files.length > 0 ? 'hover:opacity-70 active:scale-95 cursor-pointer' : 'cursor-not-allowed'} ${step === 2 ? 'text-gray-900' : 'text-gray-400'}`}
                    >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-bold shadow-sm transition-colors ${step >= 2 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                        <span className="text-sm font-bold">추출할 정보 선택</span>
                    </button>
                </div>

                {/* Info Box */}
                <div className="mx-10 mb-12 bg-slate-50 border border-gray-100 rounded-xl p-5 flex items-start space-x-4 shadow-sm">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">
                        <Lightbulb className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium leading-relaxed pt-0.5">
                        영수증/명함 등 문서들을 찍으실 땐 꼭 사진 한장에 문서들 하나씩만 찍어주세요. 사진 한장에 여러 문서가 들어가게 되면 제대로 읽어오지 못해요.
                    </p>
                </div>

                {/* Main Content Sections */}
                {step === 1 && (
                    <div className="space-y-12 animate-in fade-in duration-500 px-10">
                        {/* Upload Card */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-xl shadow-gray-200/10">
                            <div className="mb-8">
                                <h2 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">이미지 파일을 업로드 해주세요.</h2>
                                <div className="text-sm text-gray-500 font-medium space-y-1 leading-relaxed">
                                    <p>텍스트를 뽑아낼 이미지를 업로드 해주세요. 같은 종류의 이미지(ex. 영수증 5개 등)는 최대 20개까지 동시에 업로드해 한꺼번에 정보를 추출할 수 있어요.</p>
                                    <p>하지만 다른 종류의 이미지를 동시에 올리실 경우(ex. 영수증 2개 + 사업자등록증 3개) 변환 성능이 떨어지니 주의해 주세요.</p>
                                </div>
                            </div>

                            <label className="w-full py-16 bg-slate-50/50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group mb-8">
                                <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*" />
                                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-md border border-gray-100 mb-4 group-hover:scale-105 transition-transform">
                                    <Upload className="w-6 h-6 text-blue-500" />
                                </div>
                                <p className="text-sm font-bold text-gray-700 mb-1">클릭하여 파일을 선택하거나 드래그하여 추가해 주세요.</p>
                                <p className="text-[12px] text-gray-400 font-medium">동시에 20개까지 업로드 하실 수 있지만 같은 종류의 이미지만 올려주세요.</p>
                            </label>

                            {files.length > 0 && (
                                <div className="flex flex-wrap gap-2.5 mb-10 p-5 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
                                    {files.map(file => (
                                        <div key={file.id} className="flex items-center space-x-2 pl-4 pr-3 py-2 bg-white text-gray-700 rounded-xl text-[13px] font-bold border border-gray-200 shadow-sm animate-in zoom-in-95">
                                            <span className="truncate max-w-[150px]">{file.name}</span>
                                            <button onClick={() => removeFile(file.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-center">
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={files.length === 0}
                                    className={`w-full max-w-sm py-3.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-[0.98] ${files.length > 0
                                        ? 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'
                                        : 'bg-gray-100 text-gray-300 shadow-transparent cursor-not-allowed'
                                        }`}
                                >
                                    다음 단계로
                                </button>
                            </div>
                        </div>

                        {/* Recent History Table - Balanced & Centered */}
                        <div className="animate-in slide-in-from-bottom-8 duration-700 max-w-6xl mx-auto w-full">
                            <div className="flex flex-col items-center text-center mb-8">
                                <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">변환된 파일 다운로드</h3>
                                <p className="text-[13px] text-gray-400 font-medium">변환된 파일은 최대 2주간 무료로 내려 받으실 수 있습니다.</p>
                            </div>
                            <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-xl shadow-gray-200/20">
                                <table className="w-full text-left table-fixed">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-gray-100">
                                            <th className="w-[40%] px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest pl-10">업로드된 파일</th>
                                            <th className="w-[35%] px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">변환일</th>
                                            <th className="w-[25%] px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">변환 결과</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {results.map(res => (
                                            <tr key={res.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5 pl-10">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                                                        <span className="text-sm font-bold text-gray-700 truncate">{res.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="text-[13px] text-gray-500 font-bold whitespace-nowrap">{res.date}</span>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <button
                                                            onClick={() => handleDownloadExcel(res)}
                                                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] font-black text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm active:scale-95"
                                                        >
                                                            다운로드
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteResult(res.id)}
                                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                            title="이력 삭제"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {results.length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="px-8 py-12 text-center text-gray-400 text-sm font-bold">
                                                    <p className="mb-1">아직 변환된 파일 이력이 없습니다.</p>
                                                    <p className="text-[11px] font-medium opacity-60">상단에서 이미지를 업로드하고 변환을 시작해 보세요.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Configuration */}
                {step === 2 && (
                    <div className="mx-10 animate-in fade-in slide-in-from-right-8 duration-500 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-12 shadow-xl shadow-gray-200/20">
                        <div className="mb-10">
                            <h2 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">어떤 정보를 뽑을까요?</h2>
                            <div className="text-gray-500 text-[13px] leading-relaxed font-medium">
                                <p>어떤 이미지인지 알려주시면 뽑아낼 정보를 추천해 드립니다.</p>
                                <p>해당하는 문서가 없으시면 '기타'를 선택해 뽑아낼 정보를 직접 입력해 주세요. 추가로 희망하시는 문서가 없으면 <span className="underline cursor-pointer">여기</span>에 요청해 보세요.</p>
                            </div>
                        </div>

                        <div className="space-y-12">
                            {/* 문서 종류 선택 (드롭다운) */}
                            <div className="max-w-xl">
                                <div className="relative">
                                    <button
                                        onClick={() => setIsDocTypeOpen(!isDocTypeOpen)}
                                        className={`w-full flex items-center justify-between px-5 py-3.5 bg-white border rounded-xl transition-all text-left ${isDocTypeOpen ? 'border-blue-400 ring-4 ring-blue-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span className="text-sm font-bold text-gray-700">{docType}</span>
                                        </div>
                                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDocTypeOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isDocTypeOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="py-2 max-h-[300px] overflow-y-auto">
                                                {Object.keys(PRESET_TAGS).map(type => {
                                                    const isSelected = docType === type;
                                                    return (
                                                        <button
                                                            key={type}
                                                            onClick={() => {
                                                                setDocType(type);
                                                                setIsDocTypeOpen(false);
                                                            }}
                                                            className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-gray-600'}`}
                                                        >
                                                            <span className="text-sm font-bold">{type}</span>
                                                            {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 뽑아낼 정보 (태그) */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-900">뽑아낼 정보</h3>
                                <div className="flex flex-wrap gap-2.5">
                                    {tags.map(tag => (
                                        <div key={tag} className="flex items-center space-x-1.5 pl-3 pr-2 py-1.5 bg-slate-100/80 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 transition-all hover:bg-slate-200 animate-in zoom-in-90">
                                            <span>{tag}</span>
                                            <button onClick={() => removeTag(tag)} className="p-0.5 hover:bg-gray-300 rounded text-gray-400 hover:text-red-500 transition-colors">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 키워드 직접 추가 */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">더 필요한 정보를 추가해주세요.</h3>
                                    <p className="text-[12px] text-gray-400 font-medium mt-1">업로드한 이미지에 해당 정보가 없으면 제공되지 않습니다.</p>
                                </div>
                                <div className="flex space-x-3 max-w-2xl">
                                    <input
                                        type="text"
                                        placeholder="ex) 발급인"
                                        value={customTag}
                                        onChange={(e) => setCustomTag(e.target.value)}
                                        onKeyDown={handleAddTag}
                                        className="flex-1 px-5 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300"
                                    />
                                    <button onClick={handleAddTag} className="px-6 py-3 bg-slate-50 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all active:scale-95">추가</button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 mt-16 pt-10 border-t border-gray-50">
                            <button
                                onClick={() => setStep(1)}
                                className="px-8 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                            >
                                이전으로
                            </button>
                            <button
                                onClick={startConversion}
                                disabled={isProcessing}
                                className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center space-x-2.5 transition-all active:scale-[0.99]"
                            >
                                {isProcessing ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /><span>변환 중...</span></>
                                ) : (
                                    <span>변환 시작</span>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Global Styled Toast */}
            {showToast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-md text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center space-x-4 animate-in fade-in slide-in-from-bottom-10 duration-500 z-[100] border border-white/10">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-[15px] font-black">변환 작업이 시작되었습니다!</p>
                        <p className="text-[12px] text-gray-400 font-bold">잠시 후 하단 리스트에서 결과를 확인하실 수 있습니다.</p>
                    </div>
                </div>
            )}

            {/* Custom Warning Modal */}
            {warning && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
                        <div className="p-10 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-red-100">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">업로드 제한 초과</h3>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                {warning}
                            </p>
                        </div>
                        <div className="p-6 pt-0 flex space-x-3">
                            <button
                                onClick={() => setWarning(null)}
                                className="w-full py-4 text-sm font-bold text-white bg-gray-900 rounded-2xl hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-200"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OCRPoc;
