import { FingerprintDisplay } from "./FingerprintDisplay";

interface StudentFingerprintViewProps {
  student: {
    finger_1?: string;
    finger_2?: string;
    finger_3?: string;
    finger_4?: string;
    finger_5?: string;
  };
  showQuality?: boolean;
}

export function StudentFingerprintView({ student, showQuality = false }: StudentFingerprintViewProps) {
  const fingerprints = [
    student.finger_1,
    student.finger_2,
    student.finger_3,
    student.finger_4,
    student.finger_5
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {fingerprints.map((fingerprint, index) => (
        <div key={index} className="flex justify-center">
          <FingerprintDisplay
            value={fingerprint || ""}
            index={index}
            showQuality={showQuality}
          />
        </div>
      ))}
    </div>
  );
}