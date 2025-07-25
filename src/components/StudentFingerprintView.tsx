
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

  const hasCapturedFingerprints = fingerprints.some(f => f.image || f.template);

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-gray-600 mb-4">
        {hasCapturedFingerprints ? 'Captured Fingerprints' : 'No fingerprints captured yet'}
      </div>
      
      {!hasCapturedFingerprints ? (
        <div className="text-center py-8">
          <div className="text-gray-500 text-sm">
            This student hasn't enrolled any fingerprints yet.
            <br />
            Use the "Edit Student" option to capture fingerprints.
          </div>
        </div>
      ) : (
        <>
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
            <div className="flex justify-center items-center space-x-4">
              <span>
                {fingerprints.filter(f => f.image).length} images captured
              </span>
              <span>•</span>
              <span>
                {fingerprints.filter(f => f.template).length} templates saved
              </span>
            </div>
            {fingerprints.some(f => f.template && !f.image) && (
              <div className="text-yellow-600 mt-2 text-xs">
                ⚠️ Some fingerprints show "Template Saved" because only template data was captured without images.
                <br />
                To capture actual images, use the MFS100 device with proper image capture settings.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
