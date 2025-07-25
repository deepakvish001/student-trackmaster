
import { FingerprintDisplay } from "./FingerprintDisplay";

interface StudentFingerprintViewProps {
  student: {
    finger_1?: string;
    finger_2?: string;
    finger_3?: string;
    finger_4?: string;
    finger_5?: string;
    finger_1_image?: string;
    finger_2_image?: string;
    finger_3_image?: string;
    finger_4_image?: string;
    finger_5_image?: string;
  };
  showQuality?: boolean;
}

export function StudentFingerprintView({ student, showQuality = false }: StudentFingerprintViewProps) {
  const fingerprints = [
    {
      template: student.finger_1,
      image: student.finger_1_image
    },
    {
      template: student.finger_2,
      image: student.finger_2_image
    },
    {
      template: student.finger_3,
      image: student.finger_3_image
    },
    {
      template: student.finger_4,
      image: student.finger_4_image
    },
    {
      template: student.finger_5,
      image: student.finger_5_image
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-gray-600 mb-4">
        Fingerprint images captured from MFS100 device
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {fingerprints.map((fingerprint, index) => (
          <div key={index} className="flex justify-center">
            <FingerprintDisplay
              value={fingerprint.image || fingerprint.template || ""}
              index={index}
              showQuality={showQuality}
            />
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-500 text-center mt-4">
        {fingerprints.filter(f => f.image || f.template).length} of 5 fingerprints captured
      </div>
    </div>
  );
}
