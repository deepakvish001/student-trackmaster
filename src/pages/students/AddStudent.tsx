import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits"),
  batchId: z.string().min(1, "Please select a batch"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  fingerprints: z.array(z.string()).length(5, "All 5 fingerprints are required"),
});

export default function AddStudent() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mobile: "",
      batchId: "",
      address: "",
      fingerprints: ["", "", "", "", ""],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast.success("Student added successfully!");
  }

  const captureFingerprint = (index: number) => {
    // Mock fingerprint capture - in real implementation, this would interface with a fingerprint scanner
    const mockFingerprint = `fingerprint_data_${index}_${Date.now()}`;
    form.setValue(`fingerprints.${index}`, mockFingerprint);
    toast.success(`Fingerprint ${index + 1} captured successfully!`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Add Student</h2>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter Student Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter Mobile" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select batch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="2617113">2617113</SelectItem>
                            <SelectItem value="2617114">2617114</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter Address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="flex flex-col items-center space-y-4">
                      <div className="w-40 h-40 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-white">
                        {form.watch(`fingerprints.${index}`) ? (
                          <img 
                            src="/lovable-uploads/cd42953e-5a05-42ad-adfe-bc56f8a8372d.png" 
                            alt={`Fingerprint ${index + 1}`}
                            className="w-32 h-32 object-contain"
                          />
                        ) : (
                          <div className="text-gray-400">No Print</div>
                        )}
                      </div>
                      <div className="text-center font-medium">Finger {index + 1}</div>
                      <Button
                        type="button"
                        onClick={() => captureFingerprint(index)}
                        className="w-full bg-blue-500 hover:bg-blue-600"
                      >
                        Capture
                      </Button>
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-32">Submit</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}